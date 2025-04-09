import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";

const CompileButton = () => {
	return (
		<Button variant="accent" className="z-50 absolute mt-12 bottom-3 right-3 w-min">
			<PlayFilledAlt size={20} />
			Compile
		</Button>
	);
};

export default CompileButton;
