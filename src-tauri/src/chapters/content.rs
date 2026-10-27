use super::{ChapterError, MAX_SAFE_INTEGER};
use serde::{Deserialize, Serialize};

pub const MAX_BYTES: usize = 5 * 1024 * 1024;
const MAX_NODES: usize = 100_000;
const MAX_DEPTH: usize = 64;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChapterContent {
    schema_version: i64,
    document: Node,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", deny_unknown_fields)]
enum Node {
    #[serde(rename = "pageBreak")]
    PageBreak {},
    #[serde(rename = "doc")]
    Doc { content: Vec<Node> },
    #[serde(rename = "paragraph")]
    Paragraph {
        #[serde(
            default,
            deserialize_with = "paragraph_attrs",
            skip_serializing_if = "Option::is_none"
        )]
        attrs: Option<ParagraphAttrs>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        content: Vec<Node>,
    },
    #[serde(rename = "heading")]
    Heading {
        attrs: HeadingAttrs,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        content: Vec<Node>,
    },
    #[serde(rename = "bulletList")]
    BulletList { content: Vec<Node> },
    #[serde(rename = "orderedList")]
    OrderedList {
        attrs: ListAttrs,
        content: Vec<Node>,
    },
    #[serde(rename = "listItem")]
    ListItem { content: Vec<Node> },
    #[serde(rename = "text")]
    Text {
        text: String,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        marks: Vec<Mark>,
    },
    #[serde(rename = "hardBreak")]
    HardBreak {
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        marks: Vec<Mark>,
    },
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct HeadingAttrs {
    level: i64,
    #[serde(
        rename = "textAlign",
        default,
        deserialize_with = "alignment_attr",
        skip_serializing_if = "Option::is_none"
    )]
    text_align: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ParagraphAttrs {
    text_align: String,
}
fn paragraph_attrs<'de, D: serde::Deserializer<'de>>(
    decoder: D,
) -> Result<Option<ParagraphAttrs>, D::Error> {
    ParagraphAttrs::deserialize(decoder).map(Some)
}
fn alignment_attr<'de, D: serde::Deserializer<'de>>(
    decoder: D,
) -> Result<Option<String>, D::Error> {
    String::deserialize(decoder).map(Some)
}
fn valid_alignment(value: &str) -> bool {
    ["left", "center", "right", "justify"].contains(&value)
}
fn has_unsupported_alignment(node: &Node, version: i64) -> bool {
    match node {
        Node::Paragraph { attrs, content } => {
            attrs
                .as_ref()
                .is_some_and(|attrs| version < 4 || !valid_alignment(&attrs.text_align))
                || content
                    .iter()
                    .any(|child| has_unsupported_alignment(child, version))
        }
        Node::Heading { attrs, content } => {
            attrs
                .text_align
                .as_ref()
                .is_some_and(|alignment| version < 4 || !valid_alignment(alignment))
                || content
                    .iter()
                    .any(|child| has_unsupported_alignment(child, version))
        }
        Node::Doc { content }
        | Node::BulletList { content }
        | Node::OrderedList { content, .. }
        | Node::ListItem { content } => content
            .iter()
            .any(|child| has_unsupported_alignment(child, version)),
        _ => false,
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ListAttrs {
    start: i64,
    #[serde(rename = "type", default, skip_serializing_if = "Option::is_none")]
    kind: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase", deny_unknown_fields)]
enum Mark {
    Bold {},
    Italic {},
    Underline {},
    FontSize { attrs: FontSizeAttrs },
    FontFamily { attrs: FontFamilyAttrs },
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct FontSizeAttrs {
    size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct FontFamilyAttrs {
    family: String,
}
fn valid_font_family(value: &str) -> bool {
    #[derive(Deserialize)]
    struct Font {
        name: String,
    }
    static FONTS: std::sync::OnceLock<Vec<Font>> = std::sync::OnceLock::new();
    FONTS
        .get_or_init(|| {
            serde_json::from_str(include_str!("../../../resources/manuscript-fonts.json"))
                .expect("bundled font catalog")
        })
        .iter()
        .any(|font| font.name == value)
}

fn has_unsupported_marks(node: &Node, version: i64) -> bool {
    match node {
        Node::PageBreak {} => version < 6,
        Node::Text { marks, .. } | Node::HardBreak { marks } => {
            marks.iter().any(|mark| match mark {
                Mark::FontSize { .. } => version < 2,
                Mark::Underline {} => version < 3,
                Mark::FontFamily { .. } => version < 5,
                _ => false,
            })
        }
        Node::Doc { content }
        | Node::Paragraph { content, .. }
        | Node::Heading { content, .. }
        | Node::BulletList { content }
        | Node::OrderedList { content, .. }
        | Node::ListItem { content } => content
            .iter()
            .any(|child| has_unsupported_marks(child, version)),
    }
}

impl ChapterContent {
    pub(super) fn word_count(&self) -> i64 {
        fn visit(node: &Node, counter: &mut super::word_count::WordCounter) {
            match node {
                Node::Text { text, .. } => counter.push(text),
                Node::HardBreak { .. } | Node::PageBreak {} => counter.boundary(),
                Node::Doc { content }
                | Node::BulletList { content }
                | Node::OrderedList { content, .. }
                | Node::ListItem { content } => {
                    for child in content {
                        visit(child, counter);
                    }
                }
                Node::Paragraph { content, .. } | Node::Heading { content, .. } => {
                    for child in content {
                        visit(child, counter);
                    }
                    counter.boundary();
                }
            }
        }
        let mut counter = super::word_count::WordCounter::default();
        visit(&self.document, &mut counter);
        counter.count
    }
    pub(super) fn empty() -> Self {
        Self {
            schema_version: 1,
            document: Node::Doc {
                content: vec![Node::Paragraph {
                    attrs: None,
                    content: vec![],
                }],
            },
        }
    }

    /// Byte and lexical-depth bounds precede JSON decoding. The transport has already
    /// decoded the outer IPC string; this bounds parsing of the manuscript itself.
    pub fn parse(raw: &str) -> Result<Self, ChapterError> {
        if raw.len() > MAX_BYTES {
            return Err(ChapterError::Validation("too_large"));
        }
        let (mut depth, mut quoted, mut escaped) = (0usize, false, false);
        for byte in raw.bytes() {
            if quoted {
                if escaped {
                    escaped = false;
                } else if byte == b'\\' {
                    escaped = true;
                } else if byte == b'"' {
                    quoted = false;
                }
            } else {
                match byte {
                    b'"' => quoted = true,
                    b'{' | b'[' => {
                        depth += 1;
                        if depth > 196 {
                            return Err(ChapterError::Validation("too_deep"));
                        }
                    }
                    b'}' | b']' => depth = depth.saturating_sub(1),
                    _ => (),
                }
            }
        }
        let mut decoder = serde_json::Deserializer::from_str(raw);
        decoder.disable_recursion_limit(); // bounded above, including before typed decoding
        let content = Self::deserialize(&mut decoder)
            .map_err(|_| ChapterError::Validation("invalid_document"))?;
        decoder
            .end()
            .map_err(|_| ChapterError::Validation("invalid_document"))?;
        content.validate()?;
        Ok(content)
    }

    fn validate(&self) -> Result<(), ChapterError> {
        if !matches!(self.schema_version, 1..=6) {
            return Err(ChapterError::Validation("unsupported_version"));
        }
        if !matches!(self.document, Node::Doc { .. }) {
            return Err(ChapterError::Validation("invalid_document"));
        }
        validate_node(&self.document, "doc", 1, &mut 0)?;
        if has_unsupported_marks(&self.document, self.schema_version)
            || has_unsupported_alignment(&self.document, self.schema_version)
        {
            return Err(ChapterError::Validation("invalid_document"));
        }
        if serde_json::to_vec(self)
            .map_err(|_| ChapterError::Validation("invalid_document"))?
            .len()
            > MAX_BYTES
        {
            return Err(ChapterError::Validation("too_large"));
        }
        Ok(())
    }

    pub(super) fn storage(&self) -> Result<(i64, String), ChapterError> {
        self.validate()?;
        Ok((
            self.schema_version,
            serde_json::to_string(&self.document)
                .map_err(|_| ChapterError::Validation("invalid_document"))?,
        ))
    }

    pub(super) fn stored(version: i64, document: &str) -> Result<Self, ChapterError> {
        if document.len() > MAX_BYTES {
            return Err(ChapterError::InvalidStoredData);
        }
        Self::parse(&format!(
            "{{\"schemaVersion\":{version},\"document\":{document}}}"
        ))
        .map_err(|_| ChapterError::InvalidStoredData)
    }
}

fn validate_node(
    node: &Node,
    category: &str,
    depth: usize,
    count: &mut usize,
) -> Result<(), ChapterError> {
    if depth > MAX_DEPTH {
        return Err(ChapterError::Validation("too_deep"));
    }
    *count += 1;
    if *count > MAX_NODES {
        return Err(ChapterError::Validation("too_large"));
    }
    let fits = match category {
        "doc" => matches!(node, Node::Doc { .. }),
        "block" => matches!(
            node,
            Node::Paragraph { .. }
                | Node::PageBreak {}
                | Node::Heading { .. }
                | Node::BulletList { .. }
                | Node::OrderedList { .. }
        ),
        "inline" => matches!(node, Node::Text { .. } | Node::HardBreak { .. }),
        "listItem" => matches!(node, Node::ListItem { .. }),
        _ => false,
    };
    let invalid = || ChapterError::Validation("invalid_document");
    if !fits {
        return Err(invalid());
    }
    let (children, child_category) = match node {
        Node::PageBreak {} => return if depth == 2 { Ok(()) } else { Err(invalid()) },
        Node::Text { text, marks } => {
            if text.is_empty() {
                return Err(invalid());
            }
            validate_marks(marks)?;
            return Ok(());
        }
        Node::HardBreak { marks } => {
            validate_marks(marks)?;
            return Ok(());
        }
        Node::Paragraph { content, .. } => (content, "inline"),
        Node::Heading { attrs, content } => {
            if !(1..=6).contains(&attrs.level) {
                return Err(invalid());
            }
            (content, "inline")
        }
        Node::OrderedList { attrs, content } => {
            if !(1..=MAX_SAFE_INTEGER).contains(&attrs.start)
                || attrs
                    .kind
                    .as_deref()
                    .is_some_and(|kind| !["1", "a", "A", "i", "I"].contains(&kind))
            {
                return Err(invalid());
            }
            (content, "listItem")
        }
        Node::BulletList { content } => (content, "listItem"),
        Node::ListItem { content } => {
            if !matches!(content.first(), Some(Node::Paragraph { .. })) {
                return Err(invalid());
            }
            (content, "block")
        }
        Node::Doc { content } => (content, "block"),
    };
    if child_category != "inline" && children.is_empty() {
        return Err(invalid());
    }
    for child in children {
        validate_node(child, child_category, depth + 1, count)?;
    }
    Ok(())
}

fn validate_marks(marks: &[Mark]) -> Result<(), ChapterError> {
    let invalid = || ChapterError::Validation("invalid_document");
    if marks.len() > 5 {
        return Err(invalid());
    }
    for (index, mark) in marks.iter().enumerate() {
        if marks[..index]
            .iter()
            .any(|previous| std::mem::discriminant(previous) == std::mem::discriminant(mark))
        {
            return Err(invalid());
        }
        if let Mark::FontFamily { attrs } = mark
            && !valid_font_family(&attrs.family)
        {
            return Err(invalid());
        }
        if let Mark::FontSize { attrs } = mark
            && !(12..=32).contains(&attrs.size)
        {
            return Err(invalid());
        }
    }
    Ok(())
}
