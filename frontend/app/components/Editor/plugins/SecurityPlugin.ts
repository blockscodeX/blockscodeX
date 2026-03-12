import { EditorView, KeyBinding, keymap } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { SecurityOptions } from "../types";

// Module-level clipboard for internal copy/paste within editors
// This allows copy/paste within the editor while blocking external clipboard
let internalClipboard: string = "";
let lastCopyTimestamp: number = 0;

/**
 * Implements anti-cheat and editor security restrictions.
 * When allowInternalCopyPaste is true, copy/paste within the editor is allowed
 * but external clipboard content is blocked.
 */
export function securityPlugin(options: SecurityOptions, onCheat?: (reason: string) => void): Extension {
    const extensions: Extension[] = [];
    const allowInternal = options.allowInternalCopyPaste === true;

    // Handle Event-based restrictions
    const eventHandler = EditorView.domEventHandlers({
        paste(event, view) {
            if (options.disablePaste) {
                if (allowInternal) {
                    // Block the browser paste
                    event.preventDefault();
                    
                    // Check if we have internal clipboard content (copied within last 30 min)
                    const timeSinceCopy = Date.now() - lastCopyTimestamp;
                    if (internalClipboard && timeSinceCopy < 30 * 60 * 1000) {
                        // Insert the internally copied content
                        const { from, to } = view.state.selection.main;
                        view.dispatch({
                            changes: { from, to, insert: internalClipboard },
                            selection: { anchor: from + internalClipboard.length }
                        });
                        return true;
                    }
                    
                    // No internal content - this is an external paste attempt
                    onCheat?.("External paste attempt blocked");
                    return true;
                }
                event.preventDefault();
                onCheat?.("Paste attempt blocked");
                return true;
            }
        },
        copy(event, view) {
            if (options.disableCopy) {
                if (allowInternal) {
                    // Allow copy but store in internal clipboard instead of system clipboard
                    event.preventDefault();
                    const selection = view.state.sliceDoc(
                        view.state.selection.main.from,
                        view.state.selection.main.to
                    );
                    if (selection) {
                        internalClipboard = selection;
                        lastCopyTimestamp = Date.now();
                    }
                    return true;
                }
                event.preventDefault();
                onCheat?.("Copy attempt blocked");
                return true;
            }
        },
        cut(event, view) {
            if (options.disableCut) {
                if (allowInternal) {
                    // Allow cut but use internal clipboard
                    event.preventDefault();
                    const { from, to } = view.state.selection.main;
                    const selection = view.state.sliceDoc(from, to);
                    if (selection) {
                        internalClipboard = selection;
                        lastCopyTimestamp = Date.now();
                        // Remove the selected text
                        view.dispatch({
                            changes: { from, to, insert: "" }
                        });
                    }
                    return true;
                }
                event.preventDefault();
                onCheat?.("Cut attempt blocked");
                return true;
            }
        },
        drop(event, view) {
            if (options.disableDragDrop) {
                event.preventDefault();
                onCheat?.("Drag and drop attempt blocked");
                return true;
            }
        },
        contextmenu(event, view) {
            if (options.disableRightClick) {
                event.preventDefault();
                return true;
            }
        }
    });

    extensions.push(eventHandler);

    // Handle Keyboard-based restrictions
    const customKeybindings: KeyBinding[] = [];

    if (options.disableUndoRedo) {
        // Override common undo/redo combos
        customKeybindings.push(
            { key: "Mod-z", run: () => true, preventDefault: true },
            { key: "Mod-y", run: () => true, preventDefault: true },
            { key: "Mod-Shift-z", run: () => true, preventDefault: true }
        );
    }

    // For internal copy/paste, we handle via DOM events above, so we need custom keybindings
    // to intercept and handle Mod-c/v/x before they reach the browser
    if (allowInternal && (options.disableCopy || options.disablePaste || options.disableCut)) {
        if (options.disableCopy) {
            customKeybindings.push({
                key: "Mod-c",
                run: (view) => {
                    const selection = view.state.sliceDoc(
                        view.state.selection.main.from,
                        view.state.selection.main.to
                    );
                    if (selection) {
                        internalClipboard = selection;
                        lastCopyTimestamp = Date.now();
                    }
                    return true;
                },
                preventDefault: true
            });
        }
        if (options.disablePaste) {
            customKeybindings.push({
                key: "Mod-v",
                run: (view) => {
                    const timeSinceCopy = Date.now() - lastCopyTimestamp;
                    if (internalClipboard && timeSinceCopy < 30 * 60 * 1000) {
                        const { from, to } = view.state.selection.main;
                        view.dispatch({
                            changes: { from, to, insert: internalClipboard },
                            selection: { anchor: from + internalClipboard.length }
                        });
                    } else if (internalClipboard === "" || timeSinceCopy >= 30 * 60 * 1000) {
                        onCheat?.("External paste attempt blocked");
                    }
                    return true;
                },
                preventDefault: true
            });
        }
        if (options.disableCut) {
            customKeybindings.push({
                key: "Mod-x",
                run: (view) => {
                    const { from, to } = view.state.selection.main;
                    const selection = view.state.sliceDoc(from, to);
                    if (selection) {
                        internalClipboard = selection;
                        lastCopyTimestamp = Date.now();
                        view.dispatch({
                            changes: { from, to, insert: "" }
                        });
                    }
                    return true;
                },
                preventDefault: true
            });
        }
    } else if (options.disableCopy || options.disablePaste || options.disableCut) {
        // Block all copy/paste/cut completely
        if (options.disableCopy) customKeybindings.push({ key: "Mod-c", run: () => true, preventDefault: true });
        if (options.disablePaste) customKeybindings.push({ key: "Mod-v", run: () => true, preventDefault: true });
        if (options.disableCut) customKeybindings.push({ key: "Mod-x", run: () => true, preventDefault: true });
    }

    if (customKeybindings.length > 0) {
        extensions.push(keymap.of(customKeybindings));
    }

    return extensions;
}
