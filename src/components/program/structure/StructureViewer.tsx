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
		background-color: var(--color-background) !important;
	}

	/* border */
	.msp-plugin-content.msp-layout-standard.msp-layout-standard-outside {
		border: none !important;
	}

	/* panel colors */
	.msp-layout-right {
		background-color: var(--color-background) !important;
	}

	/* controls */
	.msp-layout-expanded .msp-layout-region-controls {
		background-color: var(--color-background) !important;
	}
`;

// Helper function to check if a plugin is still valid/active
function isPluginActive(plugin: PluginUIContext | undefined | null): boolean {
	try {
		// Will throw an error if disposed
		return !!plugin && plugin.state.data.tree !== undefined;
	} catch {
		return false;
	}
}

// Explicitly define the allowed format strings based on Mol* documentation/errors
type MolStarFormat = "pdb" | "mmcif" | "cifCore" | "pdbqt" | "gro" | "xyz" | "lammps_data" | "lammps_traj_data" | "mol" | "sdf" | "mol2";

interface StructureViewerProps {
	url?: string;
	format?: MolStarFormat;
	height?: string;
	width?: string;
	animate?: boolean;
}

// Cache to store plugin instances by URL (limit to 10 to prevent memory leaks)
const pluginInstanceCache = new Map<string, PluginUIContext>();
const MAX_CACHE_SIZE = 10;

// Helper function to clean up old plugins
function cleanupOldPlugins(exceptKey?: string) {
	// If we've exceeded our cache limit, remove the oldest entries
	if (pluginInstanceCache.size > MAX_CACHE_SIZE) {
		// Convert the keys to an array so we can splice
		const keys = Array.from(pluginInstanceCache.keys());

		// Remove oldest plugins (first in the Map) but keep the current one
		for (let i = 0; i < keys.length - MAX_CACHE_SIZE; i++) {
			const key = keys[i];
			if (key !== exceptKey) {
				const plugin = pluginInstanceCache.get(key);
				if (plugin) {
					try {
						plugin.dispose();
					} catch {}
				}
				pluginInstanceCache.delete(key);
			}
		}
	}
}

const StructureViewer = memo(({ url = "/6pd5.pdb", format = "pdb", height, width, animate = false }: StructureViewerProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const pluginRef = useRef<PluginUIContext | null>(null);
	const styleElementRef = useRef<HTMLStyleElement | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const cacheKey = useMemo(() => `${url}-${format}`, [url, format]);
	const initRef = useRef(false);
	const [isAnimating, setIsAnimating] = useState(animate);

	// Cache height and width classes
	const heightClass = useMemo(() => height || "h-full", [height]);
	const widthClass = useMemo(() => width || "w-full", [width]);

	// Check if already initialized for this URL
	useEffect(() => {
		initRef.current = false;
		setIsInitialized(false);
	}, [url, format]);

	useEffect(() => {
		const parentContainer = containerRef.current;
		if (!parentContainer) return;

		// Skip if already initialized for this instance
		if (initRef.current) return;
		initRef.current = true;

		// Check if we already have this plugin initialized in our cache
		const cachedPlugin = pluginInstanceCache.get(cacheKey);
		if (cachedPlugin && isPluginActive(cachedPlugin)) {
			// Reuse existing plugin
			pluginRef.current = cachedPlugin;

			// We need to reattach the plugin to this container
			parentContainer.innerHTML = "";

			// Create a new plugin container for the cached plugin
			const pluginContainer = document.createElement("div");
			pluginContainer.style.width = "100%";
			pluginContainer.style.height = "100%";
			parentContainer.appendChild(pluginContainer);

			// Re-mount the plugin to the new container
			cachedPlugin.mount(pluginContainer);

			setIsInitialized(true);
			return;
		}

		// Clear the container
		parentContainer.innerHTML = "";

		// Create a stable container that won't be affected by React re-renders
		const pluginContainer = document.createElement("div");
		pluginContainer.style.width = "100%";
		pluginContainer.style.height = "100%";
		pluginContainer.id = `mol-viewer-${Math.random().toString(36).substring(7)}`;
		parentContainer.appendChild(pluginContainer);

		let isMounted = true;

		// initialize MolStar plugin
		const init = async () => {
			// Skip initialization if already done
			if (isInitialized && pluginRef.current && isPluginActive(pluginRef.current)) {
				return;
			}

			const spec = {
				...DefaultPluginUISpec(),
				layout: {
					initial: {
						isExpanded: false,
						showControls: false,
					},
				},
				components: {
					remoteState: "none",
					viewport: {
						controls: () => null,
					},
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
					try {
						newPlugin.dispose();
					} catch {}
					return;
				}

				pluginRef.current = newPlugin;
				pluginInstanceCache.set(cacheKey, newPlugin);
				cleanupOldPlugins(cacheKey);

				// Load structure data
				const data = await newPlugin.builders.data.download({ url });

				if (!isMounted || !isPluginActive(newPlugin)) return;

				const trajectory = await newPlugin.builders.structure.parseTrajectory(data, format);

				if (!isMounted || !isPluginActive(newPlugin)) return;

				await newPlugin.builders.structure.hierarchy.applyPreset(trajectory, "default");

				if (!isMounted || !isPluginActive(newPlugin) || !newPlugin.canvas3d) return;

				// Configure 3D view
				newPlugin.canvas3d.setProps({
					camera: { manualReset: true },
					transparentBackground: false,
				});

				newPlugin.canvas3d.requestCameraReset({ durationMs: 0 });

				// Add camera spin animation if isAnimating is true
				if (isAnimating && newPlugin.canvas3d) {
					// Configure controls for spinning animation
					newPlugin.canvas3d.setProps({
						trackball: {
							animate: {
								name: "spin",
								params: { speed: 0.2 },
							},
						},
					});
					// Start animation loop
					newPlugin.canvas3d.animate();
				}

				setIsInitialized(true);
			} catch (error) {
				if (isMounted) {
					console.error("Error initializing Mol*:", error);
				}
			}
		};

		init();

		// Cleanup on unmount
		return () => {
			isMounted = false;

			// We're not disposing the plugin on unmount to preserve state
			// It will be managed by the cache
		};
	}, [url, format, cacheKey, isInitialized, isAnimating]);

	// Global cleanup for when component is fully unmounted
	useEffect(() => {
		return () => {
			if (styleElementRef.current) {
				document.head.removeChild(styleElementRef.current);
				styleElementRef.current = null;
			}
		};
	}, []);

	// Add custom styles once when component mounts
	useEffect(() => {
		if (!styleElementRef.current) {
			styleElementRef.current = document.createElement("style");
			styleElementRef.current.textContent = customStyles;
			document.head.appendChild(styleElementRef.current);
		}
	}, []);

	// Sync isAnimating with animate prop
	useEffect(() => {
		setIsAnimating(animate);
	}, [animate]);

	// Add animation effect when the isAnimating state changes
	useEffect(() => {
		if (!pluginRef.current || !isPluginActive(pluginRef.current) || !pluginRef.current.canvas3d) return;

		if (isAnimating) {
			// Configure controls for spinning animation
			pluginRef.current.canvas3d.setProps({
				trackball: {
					animate: {
						name: "spin",
						params: { speed: 0.2 },
					},
				},
			});
			// Start animation loop
			pluginRef.current.canvas3d.animate();
		} else {
			// Stop spinning by setting animation to off
			pluginRef.current.canvas3d.setProps({
				trackball: {
					animate: {
						name: "off",
						params: {},
					},
				},
			});
			// Request camera reset (stops without repositioning)
			pluginRef.current.canvas3d.requestCameraReset({ durationMs: 0 });
		}
	}, [isAnimating]);

	// Handler to stop event propagation
	const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
	};

	// Handler to toggle animation
	const toggleAnimation = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		setIsAnimating(!isAnimating);
	};

	return (
		<div className="vertical h-full w-full mx-auto justify-start" onClick={handleContainerClick}>
			{/* <div className="mb-2">Structure</div> */}
			<div className={`relative ${widthClass} ${heightClass} overflow-hidden bg-surface rounded border border-border-secondary`}>
				<div ref={containerRef} className="absolute inset-0 bg-surface mol-viewer-container"></div>

				{/* Animation toggle button */}
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
