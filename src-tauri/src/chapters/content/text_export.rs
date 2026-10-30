use super::{ChapterContent, Node};

impl ChapterContent {
    /// Plain text from already validated stored content. Marks and paper layout
    /// are presentation; literal text, paragraph boundaries and list order remain.
    pub(crate) fn plain_text(&self) -> String {
        let mut output = String::new();
        block(&self.document, 0, &mut output);
        output
    }
}

fn block(node: &Node, depth: usize, output: &mut String) {
    match node {
        Node::Text { text, .. } => output.push_str(text),
        Node::HardBreak { .. } => {
            output.push('\n');
            // A wrapped list line still belongs to this item, including inside
            // nested lists. Root-level hard breaks have no indentation.
            output.push_str(&"  ".repeat(depth));
        }
        Node::PageBreak {} => {}
        Node::Paragraph { content, .. } | Node::Heading { content, .. } => {
            for child in content {
                block(child, depth, output);
            }
        }
        Node::Doc { content } => {
            for (index, child) in content.iter().enumerate() {
                if index > 0 {
                    output.push_str("\n\n");
                }
                block(child, depth, output);
            }
        }
        Node::BulletList { content } => list(content, None, depth, output),
        Node::OrderedList { attrs, content } => list(content, Some(attrs.start), depth, output),
        Node::ListItem { content } => {
            for (index, child) in content.iter().enumerate() {
                if index > 0 {
                    output.push('\n');
                    if matches!(child, Node::Paragraph { .. } | Node::Heading { .. }) {
                        output.push_str(&"  ".repeat(depth));
                    }
                }
                block(child, depth, output);
            }
        }
    }
}

fn list(items: &[Node], start: Option<i64>, depth: usize, output: &mut String) {
    for (index, item) in items.iter().enumerate() {
        if index > 0 {
            output.push('\n');
        }
        output.push_str(&"  ".repeat(depth));
        if let Some(start) = start {
            // Validated starts and bounded node counts cannot overflow i64.
            output.push_str(&format!("{}. ", start + index as i64));
        } else {
            output.push_str("- ");
        }
        block(item, depth + 1, output);
    }
}
