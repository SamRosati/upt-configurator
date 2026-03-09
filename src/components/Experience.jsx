import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import UPTModel from './UPTModel';
import useConfiguratorStore from '../store/useConfiguratorStore';

const Experience = () => {
    const atmosphere = useConfiguratorStore((state) => state.atmosphere);

    const envMap = {
        studio: 'studio',
        indoor: 'warehouse',
        outdoor: 'park'
    };

    return (
        <Canvas shadows camera={{ position: [2, 2, 5], fov: 45 }}>
            <color attach="background" args={['#151515']} />

            <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.2}>
                    <UPTModel />
                </Bounds>
                <Environment preset={envMap[atmosphere] || 'studio'} />
            </Suspense>

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.9} />
            <ContactShadows resolution={1024} scale={10} blur={1} opacity={0.5} far={1} color="#000000" />

            <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
            <ambientLight intensity={0.5} />
        </Canvas>
    );
};

export default Experience;
