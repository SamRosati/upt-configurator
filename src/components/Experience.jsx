import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import UPTModel from './UPTModel';

const Experience = ({ theme = 'dark' }) => {
    const scene = useMemo(
        () =>
            theme === 'light'
                ? {
                      background: '#e8ecf1',
                      environment: 'apartment',
                      ambient: 0.72,
                      directional: 1.15,
                      shadowOpacity: 0.32,
                      shadowBlur: 1.4,
                  }
                : {
                      background: '#151515',
                      environment: 'city',
                      ambient: 0.5,
                      directional: 1.5,
                      shadowOpacity: 0.5,
                      shadowBlur: 1,
                  },
        [theme]
    );

    return (
        <Canvas shadows camera={{ position: [2, 2, 5], fov: 45 }}>
            <color attach="background" args={[scene.background]} />

            <Suspense fallback={null}>
                <Bounds fit clip observe margin={1.2}>
                    <UPTModel />
                </Bounds>
                <Environment preset={scene.environment} />
            </Suspense>

            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.9} />
            <ContactShadows
                resolution={1024}
                scale={10}
                blur={scene.shadowBlur}
                opacity={scene.shadowOpacity}
                far={1}
                color="#000000"
            />

            <directionalLight position={[5, 10, 5]} intensity={scene.directional} castShadow />
            <ambientLight intensity={scene.ambient} />
        </Canvas>
    );
};

export default Experience;
