import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";
import { useProgram } from "@/context/ProjectContext";
import { useGlobal } from "@/context/GlobalContext";
import { parseProgram } from "@/lib/utils/parser";

const CompileButton = () => {
	const { constructs, constraints, generators } = useProgram();
	const { currentProject, setProjectOutput } = useGlobal();

	const handleClick = async () => {
		if (!currentProject) {
			console.error("No project selected");
			return;
		}
		try {
			const projectName = currentProject?.name || "untitled";
			const parsedProgram = parseProgram(constructs, constraints, generators, projectName);

			// Log the parsed program JSON
			console.log("——— PARSED PROGRAM ———\n", JSON.stringify(parsedProgram, null, 2));

			// send the parsed program to the FastAPI endpoint
			const response = await fetch("http://localhost:8000/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ gpl_data: parsedProgram }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`API Error (${response.status}): ${errorText}`);
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log("✅ Program compiled successfully:", data);

			if (data.final_sequences && Array.isArray(data.final_sequences)) {
				const concatenatedSequence = data.final_sequences.join("");
				setProjectOutput(currentProject.id, concatenatedSequence);
			}
		} catch (error) {
			console.error("❌ Error compiling program:", error);
		}
	};

	return (
		<Button onClick={handleClick} size="sm" className="w-min">
			<PlayFilledAlt />
			Compile
		</Button>
	);
};

export default CompileButton;
