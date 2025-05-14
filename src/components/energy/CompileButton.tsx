import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";
// import { runProgram } from "@/lib/api/runProgram"; // We will use startProgramRun from context
import { useProject } from "@/context/ProjectContext";
import { useProgram } from "@/context/ProgramContext"; // Import useProgram

const CompileButton = () => {
	const { currentProgram } = useProject();
	const { startProgramRun, programRunStatus } = useProgram(); // Get startProgramRun and status

	const handleClick = () => {
		if (currentProgram?.id) {
			startProgramRun();
		} else {
			console.error("CompileButton: No current program ID to run.");
			// Optionally, show an error to the user
		}
	};

	return (
		<Button
			onClick={handleClick}
			/* variant="accent" */
			className="w-min"
			disabled={programRunStatus === "loading" || programRunStatus === "running"} // Disable if already running
		>
			<PlayFilledAlt size={20} />
			{programRunStatus === "loading" || programRunStatus === "running" ? "Running..." : "Compile"}
		</Button>
	);
};

export default CompileButton;
