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
    #[serde(rename = "doc")]
    Doc { content: Vec<Node> },
    #[serde(rename = "paragraph")]
    Paragraph {
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
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct ListAttrs {
    start: i64,
    #[serde(rename = "type", default, skip_serializing_if = "Option::is_none")]
    kind: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Mark {
    #[serde(rename = "type")]
    kind: MarkKind,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum MarkKind {
    Bold,
    Italic,
}

impl ChapterContent {
    pub(super) fn empty() -> Self {
        Self {
            schema_version: 1,
            document: Node::Doc {
                content: vec![Node::Paragraph { content: vec![] }],
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
        if self.schema_version != 1 {
            return Err(ChapterError::Validation("unsupported_version"));
        }
        if !matches!(self.document, Node::Doc { .. }) {
            return Err(ChapterError::Validation("invalid_document"));
        }
        validate_node(&self.document, "doc", 1, &mut 0)?;
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
        Node::Paragraph { content } => (content, "inline"),
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
    if marks.len() > 2 || (marks.len() == 2 && marks[0] == marks[1]) {
        Err(ChapterError::Validation("invalid_document"))
    } else {
        Ok(())
    }
}
