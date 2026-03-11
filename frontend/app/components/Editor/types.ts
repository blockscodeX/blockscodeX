import { Extension } from "@codemirror/state";

export type LanguageID = "javascript" | "typescript" | "python" | "java" | "cpp" | "c" | "python-notebook" | "go" | "rust" | "php" | "ruby" | "swift" | "kotlin" | "scala" | "r" | "perl" | "lua" | "bash" | "sql" | "sqlite3" | "csharp" | "dart" | "haskell" | "julia" | "crystal" | "nim" | "pascal" | "clojure" | "cobol" | "d" | "erlang" | "fortran" | "groovy" | "ocaml" | "powershell";

export interface LanguageConfig {
    id: LanguageID;
    label: string;
    header: string;
    initialBody: string;
    footer: string;
    extension: () => Promise<Extension>;
}

export interface SecurityOptions {
    disableCopy?: boolean;
    disablePaste?: boolean;
    disableCut?: boolean;
    disableRightClick?: boolean;
    disableUndoRedo?: boolean;
    disableMultiCursor?: boolean;
    disableDragDrop?: boolean;
    readOnly?: boolean;
}

export interface EditorActions {
    onBlur?: () => void;
    onFocus?: () => void;
    onCheatDetected?: (reason: string) => void;
    onChange?: (body: string) => void;
    onRun?: (code?: string, input?: string, expectedOutput?: string, testCaseIndex?: number) => Promise<{ passed?: boolean; error?: boolean } | void> | void;
    onSubmit?: (code: string) => Promise<{ passed?: boolean; error?: boolean } | void> | void;
    onReset?: () => Promise<string | void> | string | void;
}

export interface CodeEditorProps {
    language: LanguageConfig;
    options?: SecurityOptions;
    actions?: EditorActions;
    className?: string;
    height?: string;
    isExecuting?: boolean;
    hideLanguageSelector?: boolean;
    hideTopBar?: boolean;
    hideRunBar?: boolean;
    customToolbarContent?: React.ReactNode;
    fontSize?: number;
    // Test cases provided by the question (optional)
    testCases?: Array<any>;
    terminalOutput?: string;
    hideSubmit?: boolean;
}
