import { useState } from "react";
import PostSildeOp from "../components/PostSildeOp";

export default function Test() {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ height: "100dvh", padding: 16 }}>

      <PostSildeOp
        open={open}
        onClose={() => setOpen(false)}
        header={<div>DOKK1</div>}
        initialHeight={140}
        maxHeightPercent={85}
      >
      </PostSildeOp>
    </div>
  );
}
