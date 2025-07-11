import { useEffect, useRef, memo, useState, useMemo, MouseEvent } from "react";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import { Pause, Play } from "@carbon/icons-react";
import { Button } from "@/components/ui/button";

// custom styles for the MolStar viewer
const customStyles = `
	/* hide animation button */
	.msp-btn.msp-btn-icon.msp-btn-link-toggle-off.msp-transparent-bg {
		display: none !important;
	}

	/* viewport background */
	.msp-viewport {
		background-color: #ffffff !important;
	}

	/* border */
	.msp-plugin-content.msp-layout-standard.msp-layout-standard-outside {
		border: none !important;
	}

	/* panel colors */
	.msp-layout-right {
		background-color: #ffffff !important;
	}

	/* controls */
	.msp-layout-expanded .msp-layout-region-controls {
		background-color: #ffffff !important;
	}
`;

const isPluginActive = (plugin: PluginUIContext | undefined | null): boolean => !!plugin?.state?.data?.tree;

type MolStarFormat = "pdb" | "mmcif" | "cifCore" | "pdbqt" | "gro" | "xyz" | "lammps_data" | "lammps_traj_data" | "mol" | "sdf" | "mol2";

interface StructureViewerProps {
	url?: string;
	format?: MolStarFormat;
	animate?: boolean;
	isVisible?: boolean;
}

const pluginInstanceCache = new Map<string, PluginUIContext>();
const MAX_CACHE_SIZE = 10;

const stopAnimation = (plugin: PluginUIContext) => {
	plugin.canvas3d?.setProps({
		trackball: { animate: { name: "off", params: {} } },
	});
};

const pauseAllCachedPlugins = () => {
	pluginInstanceCache.forEach((plugin) => {
		if (isPluginActive(plugin)) {
			stopAnimation(plugin);
			plugin.canvas3d?.pause();
		}
	});
};

const cleanupOldPlugins = (exceptKey?: string) => {
	if (pluginInstanceCache.size <= MAX_CACHE_SIZE) return;

	const keys = Array.from(pluginInstanceCache.keys());
	const toRemove = keys.slice(0, keys.length - MAX_CACHE_SIZE).filter((k) => k !== exceptKey);

	toRemove.forEach((key) => {
		pluginInstanceCache.get(key)?.dispose();
		pluginInstanceCache.delete(key);
	});
};

const StructureViewer = memo(({ url = "/6pd5.pdb", format = "pdb", animate = false, isVisible = true }: StructureViewerProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const pluginRef = useRef<PluginUIContext | null>(null);
	const styleElementRef = useRef<HTMLStyleElement | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [userWantsToAnimate, setUserWantsToAnimate] = useState(animate);
	const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

	const cacheKey = useMemo(() => `${url}-${format}`, [url, format]);
	const isAnimating = userWantsToAnimate && isVisible && isPageVisible;

	useEffect(() => {
		if (!styleElementRef.current) {
			styleElementRef.current = document.createElement("style");
			styleElementRef.current.textContent = customStyles;
			document.head.appendChild(styleElementRef.current);
		}

		return () => {
			styleElementRef.current?.remove();
			styleElementRef.current = null;
		};
	}, []);

	useEffect(() => {
		const handleVisibilityChange = () => setIsPageVisible(!document.hidden);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, []);

	useEffect(() => {
		const parentContainer = containerRef.current;
		if (!parentContainer) return;

		const cachedPlugin = pluginInstanceCache.get(cacheKey);
		if (cachedPlugin && isPluginActive(cachedPlugin)) {
			pluginRef.current = cachedPlugin;
			parentContainer.innerHTML = "";

			const pluginContainer = document.createElement("div");
			pluginContainer.style.cssText = "width: 100%; height: 100%";
			parentContainer.appendChild(pluginContainer);

			cachedPlugin.mount(pluginContainer);
			stopAnimation(cachedPlugin);
			setIsInitialized(true);
			return;
		}

		parentContainer.innerHTML = "";
		const pluginContainer = document.createElement("div");
		pluginContainer.style.cssText = "width: 100%; height: 100%";
		pluginContainer.id = `mol-viewer-${Math.random().toString(36).substring(7)}`;
		parentContainer.appendChild(pluginContainer);

		let isMounted = true;

		const init = async () => {
			if (isInitialized && pluginRef.current && isPluginActive(pluginRef.current)) return;

			const spec = {
				...DefaultPluginUISpec(),
				layout: {
					initial: { isExpanded: false, showControls: false },
				},
				components: {
					remoteState: "none",
					viewport: { controls: () => null },
					hideTaskOverlay: true,
				},
			} as const;

			try {
				const newPlugin = await createPluginUI({
					target: pluginContainer,
					render: renderReact18,
					spec,
				});

				if (!isMounted) {
					newPlugin.dispose();
					return;
				}

				pluginRef.current = newPlugin;
				pluginInstanceCache.set(cacheKey, newPlugin);
				cleanupOldPlugins(cacheKey);

				const data = await newPlugin.builders.data.download({ url });
				if (!isMounted || !isPluginActive(newPlugin)) return;

				const trajectory = await newPlugin.builders.structure.parseTrajectory(data, format);
				if (!isMounted || !isPluginActive(newPlugin)) return;

				await newPlugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
				if (!isMounted || !isPluginActive(newPlugin) || !newPlugin.canvas3d) return;

				newPlugin.canvas3d.setProps({
					camera: { manualReset: true },
					transparentBackground: false,
				});
				newPlugin.canvas3d.requestCameraReset({ durationMs: 0 });

				setIsInitialized(true);
			} catch (error) {
				if (isMounted) console.error("Error initializing Mol*:", error);
			}
		};

		init();

		return () => {
			isMounted = false;
			if (pluginRef.current && isPluginActive(pluginRef.current)) {
				stopAnimation(pluginRef.current);
			}
		};
	}, [url, format, cacheKey, isInitialized]);

	useEffect(() => {
		setUserWantsToAnimate(animate);
	}, [animate]);

	useEffect(() => {
		const plugin = pluginRef.current;
		if (!plugin || !isPluginActive(plugin) || !plugin.canvas3d) return;

		if (isAnimating) {
			plugin.canvas3d.setProps({
				trackball: {
					animate: { name: "spin", params: { speed: 0.2 } },
				},
			});
			plugin.canvas3d.animate();
		} else {
			stopAnimation(plugin);
		}
	}, [isAnimating, isInitialized]);

	useEffect(() => {
		if (!isVisible) {
			pauseAllCachedPlugins();
		} else {
			pluginRef.current?.canvas3d?.resume();
		}
	}, [isVisible]);

	const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => e.stopPropagation();
	const toggleAnimation = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		setUserWantsToAnimate(!userWantsToAnimate);
	};

	return (
		<div className="vertical h-full w-full mx-auto justify-start" onClick={handleContainerClick}>
			<div className="relative w-full h-full overflow-hidden bg-surface rounded border border-border-secondary">
				<div ref={containerRef} className="absolute inset-0 bg-surface mol-viewer-container" />

				{animate && (
					<Button onClick={toggleAnimation} variant="outline" size="icon-sm" className="absolute bottom-2 right-2 z-10">
						{isAnimating ? <Pause className="text-text-subtext" /> : <Play className="text-text-subtext" />}
					</Button>
				)}
			</div>
		</div>
	);
});

StructureViewer.displayName = "StructureViewer";

export default StructureViewer;
