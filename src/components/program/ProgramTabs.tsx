import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProgramTabsProps = {
	defaultValue: string;
	onValueChange: (value: string) => void;
};

const ProgramTabs = ({ defaultValue, onValueChange }: ProgramTabsProps) => {
	return (
		<Tabs defaultValue={defaultValue} onValueChange={onValueChange} className="-m-[5px] -mr-2">
			<TabsList>
				<TabsTrigger value="program">Program</TabsTrigger>
				<TabsTrigger value="structure">Structure</TabsTrigger>
			</TabsList>
		</Tabs>
	);
};

export default ProgramTabs;
