import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SettingsAdjust, Save } from "@carbon/icons-react";

const ConstructConfig = () => {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon-sm" className="text-slate-400 hover:!text-slate-700">
					<SettingsAdjust size={18} />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="grid gap-4">
					<div className="vertical gap-1">
						<h4 className="leading-none text-sm font-medium">Construct Configuration</h4>
						<p className="text-muted-foreground text-xs">Edit the settings for this construct</p>
					</div>
					<div className="grid gap-2">
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="maxWidth">Sequence Type</Label>
							<Select>
								<SelectTrigger className="flex w-full col-span-2 h-8">
									<SelectValue placeholder="Select a type" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Sequence types</SelectLabel>
										<SelectItem value="dna">DNA</SelectItem>
										<SelectItem value="rna">RNA</SelectItem>
										<SelectItem value="protein">Protein</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
						<div className="grid grid-cols-3 items-center gap-4">
							<Label htmlFor="maxWidth">Global Generator</Label>
							<Select>
								<SelectTrigger className="flex w-full col-span-2 h-8">
									<SelectValue placeholder="Select a generator" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Generators</SelectLabel>
										<SelectItem value="beam">Sequential</SelectItem>
										<SelectItem value="mcmc">MCMC</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>
					</div>
					{/* TODO: button should be disabled unless changes were made */}
					<Button variant="outline" className="w-min justify-self-end">
						<Save size={18} />
						Save
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
};

export default ConstructConfig;
