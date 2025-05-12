import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { tokyoNightDay } from "@uiw/codemirror-theme-tokyo-night-day";
import { EditorView } from "@codemirror/view";
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
	return (
		<CodeMirror
			extensions={[python(), bgTheme]}
			value={
				'from language import (\n    FixedLengthSequenceSegment,\n    ProgramNode,\n    MaximizePTM,\n    MaximizePLDDT,\n    SymmetryRing,\n    run_simulated_annealing\n)\nclass FoldingCallback:\n    def fold(self, sequence, residue_indices):\n        return {\n            "ptm": 0.50,\n            "plddt": 75.0,\n            "symmetry_score": 1.0\n        }\nfolding_callback = FoldingCallback()\nN = 4\nprotomer = FixedLengthSequenceSegment(25)\ndef make_protomer_node():\n    return ProgramNode(sequence_segment=protomer)\nprogram = ProgramNode(\n    energy_function_terms=[\n        MaximizePTM(),\n        MaximizePLDDT(),\n        SymmetryRing()\n    ],\n    energy_function_weights=[1.0, 1.0, 1.0],\n    children=[make_protomer_node() for _ in range(N)]\n)\nsequence, residue_indices = program.get_sequence_and_set_residue_index_ranges()\nenergy_terms = program.get_energy_term_functions()\nfolding_output = folding_callback.fold(sequence, residue_indices)\nfor name, weight, energy_fn in energy_terms:\n    energy_value = energy_fn(folding_output)\n    print(f"{name} = {weight:.1f} * {energy_value:.2f}")\noptimized_program = run_simulated_annealing(\n    program=program,\n    initial_temperature=1.0,\n    annealing_rate=0.97,\n    total_num_steps=10_000,\n    folding_callback=folding_callback,\n    display_progress=True,\n)\noptimized_sequence, _ = optimized_program.get_sequence_and_set_residue_index_ranges()\nprint("Final sequence = {}".format(optimized_sequence))\n'
			}
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
