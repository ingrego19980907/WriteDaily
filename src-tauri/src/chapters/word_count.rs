use serde::Deserialize;
use std::sync::OnceLock;

#[derive(Deserialize)]
struct Categories {
    ranges: Vec<[u32; 3]>,
}

fn category(character: char) -> u32 {
    static CATEGORIES: OnceLock<Categories> = OnceLock::new();
    let categories = CATEGORIES.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../resources/unicode/word-categories-17.0.0.json"
        ))
        .expect("validated bundled Unicode categories")
    });
    let point = character as u32;
    let index = categories.ranges.partition_point(|range| range[1] < point);
    categories
        .ranges
        .get(index)
        .filter(|range| range[0] <= point)
        .map_or(0, |range| range[2])
}

#[derive(Default)]
pub(super) struct WordCounter {
    pub count: i64,
    in_word: bool,
    number: bool,
    connector: u8, // 0 none; 1 apostrophe/hyphen; 2 decimal/group separator
}

impl WordCounter {
    pub fn boundary(&mut self) {
        self.in_word = false;
        self.number = false;
        self.connector = 0;
    }
    pub fn push(&mut self, text: &str) {
        for character in text.chars() {
            if matches!(character, '\u{00ad}' | '\u{200c}' | '\u{200d}') {
                continue;
            }
            let join = matches!(
                character,
                '\'' | '\u{2018}' | '\u{2019}' | '\u{02bc}' | '-' | '\u{2010}' | '\u{2011}'
            );
            let numeric = matches!(character, '.' | ',');
            if join || numeric {
                if self.in_word && self.connector == 0 && (join || self.number) {
                    self.connector = if join { 1 } else { 2 };
                } else {
                    self.boundary();
                }
                continue;
            }
            let kind = category(character);
            if kind == 1 || kind == 2 {
                if !self.in_word || (self.connector == 2 && kind != 2) {
                    self.count += 1;
                }
                self.in_word = true;
                self.number = kind == 2;
                self.connector = 0;
            } else if kind != 3 || self.connector != 0 {
                self.boundary();
            }
        }
    }
}
