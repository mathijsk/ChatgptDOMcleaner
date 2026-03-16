<p align="center">
  <img src="screenshots/ChatgptDOMcleaner.png" alt="ChatGPT DOM Cleaner Banner">
</p>

# ChatGPT DOM Cleaner

ChatGPT DOM Cleaner

ChatGPT DOM Cleaner is a small Firefox extension that keeps the ChatGPT web interface responsive during long conversations.

If you’ve ever used ChatGPT for coding sessions or debugging help, you may have noticed that after a while the page starts getting slow. Scrolling becomes choppy, typing lags, and memory usage gradually increases.

This extension tries to keep the page manageable by collapsing and trimming older content so the browser doesn't have to keep rendering everything at once.


Why this exists

The ChatGPT web UI keeps the entire conversation rendered in the page. When conversations get long — especially when code blocks, logs, or large pasted files are involved — the browser can end up managing tens of thousands of DOM nodes.

That can lead to:

- sluggish scrolling
- typing delays
- increasing memory usage
- periodic garbage collection spikes

This extension reduces the amount of content actively present in the DOM while still keeping the conversation intact.


What it does

Collapse large pasted messages

If a user message contains a lot of lines (for example when pasting configuration files, logs, or source code), the extension 
collapses it into a small expandable block immediately after pasting, so it will only take one line of space. If you click it, it will show the original block.


Example:

```
Expand long message (220 lines)
```

This keeps large pasted blocks from filling the entire screen while scrolling through the conversation.


Collapse older code blocks

Code blocks from older messages are automatically collapsed once they are far enough away from the newest message.

This makes it much easier to scroll through long coding conversations without constantly passing large blocks of code.

So the entire context becomes readable instead of difficult to follow when looking back for something.


Trim old messages from the DOM

When the conversation becomes large enough, older messages are temporarily removed from the DOM to keep the page lightweight.

Important: messages are **not deleted**. They are restored automatically if you scroll back up.


Restore messages when scrolling

When scrolling toward the beginning of the conversation, previously trimmed messages are reinserted in small batches.

From the user's perspective the chat still behaves normally.


Pin important messages

You can double-click any message to pin it. Pinned messages are never trimmed from the DOM.

This is useful for things like:

- baseline prompts
- architecture descriptions
- project instructions you keep referencing


Configurable behavior

The popup settings allow you to adjust:

- how many lines trigger text collapsing
- when code blocks should collapse
- how many messages remain visible
- when DOM trimming begins
- soft and hard DOM limits

This makes it easy to tune the behavior depending on how you use ChatGPT.


Example: DOM size before and after

Without cleanup, large ChatGPT sessions can accumulate very large DOM trees.

Typical example:

| Situation | DOM Nodes |
|----------|-----------|
| Fresh chat | ~5k–10k |
| Medium conversation | ~30k–50k |
| Long conversation | 80k–120k+ |

With DOM Cleaner active:

| Situation | DOM Nodes |
|----------|-----------|
| Fresh chat | ~5k–10k |
| Medium conversation | ~20k–30k |
| Long conversation | kept near configured limits |

Keeping the DOM smaller makes scrolling and typing noticeably smoother.


Typical usage scenario

This extension is most useful when ChatGPT is used for:

- coding help
- debugging sessions
- reviewing large configuration files
- analyzing logs
- long technical discussions

These types of conversations tend to accumulate very large blocks of text and code.


Permissions

The extension only requires:

storage

This permission is used to store the settings configured in the popup.

The extension:

- does not collect user data
- does not send network requests
- runs only on ChatGPT pages

Supported pages

https://chatgpt.com/*
https://chat.openai.com/*


Installation

Install the signed `.xpi` file through Firefox:

about:addons → Install Add-on From File

Collapsed code blocks when scrolling back:
![Collapsed code](screenshots/screenshot1.png)

Trim the settings best for your own needs:
![ChatGPT DOM Cleaner](screenshots/screenshot2.png)
Notes

This extension is simply a small utility intended to make long ChatGPT sessions easier to work with, especially when dealing with large pasted inputs or code blocks.
