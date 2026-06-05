import { useEffect, useState } from "react";

export function useResponsiveSceneSize({SCENE_SIZE}: {SCENE_SIZE: { width: number; height: number }}) {
  const [size, setSize] = useState<{ width: number; height: number }>(SCENE_SIZE);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) {
        setSize({ width: 100, height: 130 });
      } else if (w < 1024) {
        setSize({ width: 130, height: 170 });
      } else {
        setSize(SCENE_SIZE);
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [SCENE_SIZE]);

  return size;
}
