use super::*;
use crate::{
    books::{self, BookDetails, BookRepository},
    chapters::{ChapterContent, ChapterDetails},
    database,
};
use serde_json::{Value, json};

const COMMON: &str = include_str!("../../../tests/fixtures/text-export/common.json");
const COMMON_TEXT: &str = include_str!("../../../tests/fixtures/text-export/common.txt");
const FORMATTED: &str = include_str!("../../../tests/fixtures/text-export/formatted.json");
const FORMATTED_TEXT: &str = include_str!("../../../tests/fixtures/text-export/formatted.txt");

fn paragraph(text: &str) -> Value {
    if text.is_empty() {
        json!({"type":"paragraph"})
    } else {
        json!({"type":"paragraph","content":[{"type":"text","text":text}]})
    }
}
fn document(content: Vec<Value>) -> ChapterContent {
    ChapterContent::parse(
        &json!({"schemaVersion":6,"document":{"type":"doc","content":content}}).to_string(),
    )
    .unwrap()
}

#[test]
fn all_six_stored_versions_share_the_common_portable_golden() {
    for version in 1..=6 {
        let mut source: Value = serde_json::from_str(COMMON).unwrap();
        source["schemaVersion"] = json!(version);
        let content = ChapterContent::parse(&source.to_string()).unwrap();
        let original = content.clone();
        assert_eq!(content.plain_text().as_bytes(), COMMON_TEXT.as_bytes());
        assert_eq!(content, original);
    }
}

#[test]
fn full_formatting_page_boundaries_and_unicode_match_the_portable_golden() {
    let content = ChapterContent::parse(FORMATTED).unwrap();
    let original = content.clone();
    assert_eq!(content.plain_text().as_bytes(), FORMATTED_TEXT.as_bytes());
    assert_eq!(content, original);
}

#[test]
fn hard_breaks_keep_list_continuations_at_their_nesting_depth() {
    let content = document(vec![json!({"type":"bulletList","content":[
        {"type":"listItem","content":[
            {"type":"paragraph","content":[{"type":"hardBreak"},{"type":"text","text":"First"},{"type":"hardBreak"},{"type":"hardBreak"},{"type":"text","text":"Last"}]},
            {"type":"orderedList","attrs":{"start":1},"content":[{"type":"listItem","content":[
                {"type":"paragraph","content":[{"type":"text","text":"Nested"},{"type":"hardBreak"},{"type":"text","text":"Still nested"}]}
            ]}]}
        ]},
        {"type":"listItem","content":[paragraph("Sibling")]}
    ]})]);
    assert_eq!(
        content.plain_text(),
        "- \n  First\n  \n  Last\n  1. Nested\n    Still nested\n- Sibling"
    );
}

#[test]
fn literal_whitespace_line_endings_and_split_unicode_are_not_rewritten() {
    let content = document(vec![json!({"type":"paragraph","content":[
        {"type":"text","text":"  \t<em>& literal</em>\r","marks":[{"type":"bold"}]},
        {"type":"text","text":"\nCRLF\rCR\nLF\u{a0}e","marks":[{"type":"italic"}]},
        {"type":"text","text":"\u{301} 👩\u{200d}","marks":[{"type":"underline"}]},
        {"type":"text","text":"💻\u{feff}  "}
    ]})]);
    assert_eq!(
        content.plain_text(),
        "  \t<em>& literal</em>\r\nCRLF\rCR\nLF\u{a0}e\u{301} 👩\u{200d}💻\u{feff}  "
    );
}

#[test]
fn all_heading_levels_keep_text_without_font_or_markup_injection() {
    let content = document(
        (1..=6)
            .map(|level| {
                json!({"type":"heading","attrs":{"level":level,"textAlign":"right"},"content":[
                    {"type":"text","text":format!("H{level}"),"marks":[{"type":"underline"},{"type":"fontSize","attrs":{"size":32}}]}
                ]})
            })
            .collect(),
    );
    assert_eq!(content.plain_text(), "H1\n\nH2\n\nH3\n\nH4\n\nH5\n\nH6");
}

#[test]
fn empty_blocks_and_repeated_page_boundaries_never_join_neighboring_text() {
    let content = document(vec![
        paragraph(""),
        json!({"type":"pageBreak"}),
        paragraph(""),
        json!({"type":"pageBreak"}),
        paragraph("tail"),
        paragraph(""),
    ]);
    assert_eq!(content.plain_text(), "\n\n\n\n\n\n\n\ntail\n\n");
    let empty_item = document(vec![json!({"type":"bulletList","content":[
        {"type":"listItem","content":[paragraph("")]},
        {"type":"listItem","content":[paragraph("Next")]}
    ]})]);
    assert_eq!(empty_item.plain_text(), "- \n- Next");
}

#[test]
fn all_ordered_styles_keep_exact_decimal_starts_even_beyond_js_safe_sums() {
    for style in ["1", "a", "A", "i", "I"] {
        let content = document(vec![
            json!({"type":"orderedList","attrs":{"start":crate::chapters::MAX_SAFE_INTEGER,"type":style},"content":[
                {"type":"listItem","content":[paragraph("First")]},
                {"type":"listItem","content":[paragraph("Second")]},
                {"type":"listItem","content":[paragraph("Third")]}
            ]}),
        ]);
        assert_eq!(
            content.plain_text(),
            "9007199254740991. First\n9007199254740992. Second\n9007199254740993. Third"
        );
    }
}

#[test]
fn real_chapter_and_book_files_keep_golden_utf8_bytes_and_source_records_after_reopen() {
    let dir = tempfile::tempdir().unwrap();
    let db = database::open(dir.path()).unwrap();
    let mut c = db.lock().unwrap();
    let book = BookRepository::new(&mut c)
        .create(BookDetails {
            title: "Портативна книга 🌿".into(),
            target_word_count: None,
            daily_word_goal: None,
            deadline: None,
        })
        .unwrap();
    let mut chapters = Vec::new();
    for (title, source) in [("Основи", COMMON), ("Оформлення", FORMATTED)] {
        let created = ChapterRepository::new(&mut c)
            .create(
                &book.id,
                ChapterDetails {
                    title: title.into(),
                },
            )
            .unwrap();
        chapters.push(
            ChapterRepository::new(&mut c)
                .save_content(
                    &book.id,
                    &created.summary.id,
                    created.summary.revision,
                    source,
                )
                .unwrap(),
        );
    }
    let entries: Vec<_> = chapters
        .iter()
        .map(|chapter| ChapterOrderEntry {
            id: chapter.summary.id.clone(),
            revision: chapter.summary.revision,
        })
        .collect();
    // Snapshot source and activity/achievement tables, including original JSON.
    let tables = [
        "books",
        "chapters",
        "writing_activity",
        "activity_operations",
        "activity_day_plans",
        "achievement_unlocks",
        "achievement_notification_receipts",
    ];
    let facts = |connection: &Connection| -> Vec<Vec<Vec<rusqlite::types::Value>>> {
        tables
            .iter()
            .map(|table| {
                let mut statement = connection
                    .prepare(&format!("SELECT * FROM {table} ORDER BY rowid"))
                    .unwrap();
                let columns = statement.column_count();
                statement
                    .query_map([], |row| (0..columns).map(|index| row.get(index)).collect())
                    .unwrap()
                    .collect::<Result<Vec<_>, _>>()
                    .unwrap()
            })
            .collect()
    };
    let before = facts(&c);
    let expected_chapter = format!("Оформлення\n\n{FORMATTED_TEXT}\n");
    let expected_book = format!(
        "Портативна книга 🌿\n\nОснови\n\n{COMMON_TEXT}\n\n\nОформлення\n\n{FORMATTED_TEXT}\n"
    );
    drop(c);
    drop(db);
    for attempt in 0..2 {
        let reopened = database::open(dir.path()).unwrap();
        let mut c = reopened.lock().unwrap();
        assert_eq!(facts(&c), before);
        assert_eq!(books::load(&c, &book.id).unwrap(), book);
        let chapter = SavedChapterExport::load(
            &mut c,
            &book.id,
            &chapters[1].summary.id,
            chapters[1].summary.revision,
        )
        .unwrap();
        let whole_book =
            SavedBookExport::load(&mut c, &book.id, &book.updated_at, &entries).unwrap();
        let chapter_path = dir.path().join(format!("Розділ-{attempt}.txt"));
        let book_path = dir.path().join(format!("Книга-{attempt}.txt"));
        chapter.write_new(&chapter_path).unwrap();
        whole_book.write_new(&book_path).unwrap();
        for (path, expected) in [
            (chapter_path, &expected_chapter),
            (book_path, &expected_book),
        ] {
            let bytes = std::fs::read(path).unwrap();
            assert!(!bytes.starts_with(&[0xef, 0xbb, 0xbf]));
            assert!(!bytes.contains(&b'\r')); // Fixtures contain only generated LF.
            assert_eq!(bytes, expected.as_bytes());
            assert_eq!(String::from_utf8(bytes).unwrap(), *expected);
        }
        assert_eq!(facts(&c), before);
    }
}
