import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";

const CompileButton = () => {
	const handleClick = () => {
		console.log("compile");
	};

	return (
		<Button onClick={handleClick} size="sm" className="w-min">
			<PlayFilledAlt />
			Compile
		</Button>
	);
};

export default CompileButton;
