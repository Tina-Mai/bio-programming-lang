import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { tokyoNightDay } from "@uiw/codemirror-theme-tokyo-night-day";
import { EditorView } from "@codemirror/view";
import { useGlobal } from "@/context/GlobalContext";
import { RefObject } from "react";

const bgTheme = EditorView.theme({
	"&": {
		backgroundColor: "transparent !important",
	},
	".cm-gutters": {
		backgroundColor: "transparent !important",
		border: "none",
	},
	".cm-content": {
		caretColor: "black",
	},
});

interface CodeEditorProps {
	editorRef: RefObject<EditorView | null>;
}

const CodeEditor = ({ editorRef }: CodeEditorProps) => {
	const { currentProject, setCurrentProject } = useGlobal();

	return (
		<CodeMirror
			extensions={[python(), bgTheme]}
			value={currentProject?.code || ""}
			onChange={(value) => {
				setCurrentProject({ ...currentProject, code: value });
			}}
			height="100%"
			width="100%"
			className="h-full w-full"
			theme={tokyoNightDay}
			onCreateEditor={(view) => {
				editorRef.current = view;
			}}
		/>
	);
};

export default CodeEditor;
