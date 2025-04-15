import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Help } from "@carbon/icons-react";

const HelpTooltip = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>
					<Help size={size} className="text-slate-400" />
				</TooltipTrigger>
				<TooltipContent>{children}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

export default HelpTooltip;
