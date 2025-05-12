import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";

const CompileButton = () => {
	return (
		<Button /* variant="accent" */ className="w-min">
			<PlayFilledAlt size={20} />
			Compile
		</Button>
	);
};

export default CompileButton;
