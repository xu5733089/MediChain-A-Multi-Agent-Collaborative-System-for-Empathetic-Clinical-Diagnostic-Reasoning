import React from "react";
import { Composition } from "remotion";
import { MediChainVideo } from "./MediChainVideo";

export const Root: React.FC = () => {
  return (
    <Composition
      id="MediChain"
      component={MediChainVideo}
      durationInFrames={1800} // 60s at 30fps
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};
