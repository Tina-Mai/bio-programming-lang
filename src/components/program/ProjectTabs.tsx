import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProjectTabs = () => {
	return (
		<Tabs defaultValue="program" className="-m-[5px] -mr-2">
			<TabsList>
				<TabsTrigger value="program">Program</TabsTrigger>
				<TabsTrigger value="structure">Structure</TabsTrigger>
			</TabsList>
		</Tabs>
	);
};

export default ProjectTabs;
