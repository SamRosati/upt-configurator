import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import useConfiguratorStore from '../store/useConfiguratorStore';
import nodeNameAliases from '../data/nodeNameAliases.json';

class AssetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.warn('Failed to load GLB asset:', this.props.url, error);
    }

    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

const SingleAsset = ({ url, selectedPartNodeNames }) => {
    const { scene } = useGLTF(url);

    const clone = React.useMemo(() => {
        const c = scene.clone(true);

        // Hide everything by default, then selectively re-enable selected part roots (and their descendants).
        c.traverse((node) => {
            if (node.isMesh || node.isGroup) node.visible = false;
        });

        // Keep any "base" nodes visible (common convention in exported assemblies).
        c.traverse((node) => {
            if ((node.isMesh || node.isGroup) && node.name?.toLowerCase().includes('base')) {
                node.visible = true;
            }
        });

        let foundAnySelectedNode = false;
        selectedPartNodeNames.forEach((nodeName) => {
            if (!nodeName) return;
            const obj =
                c.getObjectByName(nodeName) ||
                (nodeNameAliases[nodeName] ? c.getObjectByName(nodeNameAliases[nodeName]) : null);
            if (!obj) return;
            foundAnySelectedNode = true;

            // Make selected object + descendants visible
            obj.visible = true;
            obj.traverse((child) => {
                child.visible = true;
            });

            // Ensure ancestors are visible too (otherwise a visible child can still be culled)
            let parent = obj.parent;
            while (parent) {
                parent.visible = true;
                parent = parent.parent;
            }
        });

        if (selectedPartNodeNames.length > 0 && !foundAnySelectedNode) {
            console.warn(
                '[UPTModel] No GLB nodes matched for',
                selectedPartNodeNames,
                '- add names to src/data/nodeNameAliases.json or fix Node_Name in the spreadsheet.'
            );
        }

        return c;
    }, [scene, selectedPartNodeNames.join('|')]);

    return <primitive object={clone} scale={[1, 1, 1]} />;
};

const UPTModel = () => {
    const getAssetsToLoad = useConfiguratorStore(state => state.getAssetsToLoad);
    const selectedParts = useConfiguratorStore(state => state.selectedParts);
    const matrix = useConfiguratorStore(state => state.matrix);

    const assets = getAssetsToLoad();

    // Map GLB files to the set of node names that should be visible in them
    const glbPartNodes = React.useMemo(() => {
        const mapping = {};
        Object.entries(selectedParts).forEach(([catId, partIds]) => {
            const ids = Array.isArray(partIds) ? partIds : [partIds];
            ids.forEach(id => {
                const part = matrix.parts.find(p => p.id === id);
                if (part && part.glb) {
                    const filename = part.glb.split(/[/\\]/).pop();
                    const url = `/models/parts/${filename}`;
                    if (!mapping[url]) mapping[url] = new Set();
                    mapping[url].add(part.node);
                }
            });
        });
        return mapping;
    }, [selectedParts, matrix]);

    return (
        <group>
            {assets.map((url) => (
                <AssetErrorBoundary key={url} url={url}>
                    <Suspense fallback={null}>
                        <SingleAsset
                            url={url}
                            selectedPartNodeNames={glbPartNodes[url] ? Array.from(glbPartNodes[url]) : []}
                        />
                    </Suspense>
                </AssetErrorBoundary>
            ))}
        </group>
    );
};

export default UPTModel;
