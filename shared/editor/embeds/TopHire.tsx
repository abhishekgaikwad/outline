import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function TopHire(props: Props) {
  let url, path, width;
  width = "400px";
  let isAudio = false;
  try {
    url = new URL(props.attrs.href);
    path = url.pathname;
    if (path.startsWith("/a1/")) {
      isAudio = true;
    }
    url.searchParams.set("isDark", props.theme.isDark);
    url.searchParams.set("background", props.theme.background);
  } catch {
    // noop
  }

  if (isAudio) {
    width = "100px";
  }
  return (
    <Frame {...props} src={`${url.href}`} title={`Video`} height={`${width}`} />
  );
}

TopHire.ENABLED = [new RegExp("^https?://video\\.tophire\\.co/(.*)$")];

export default TopHire;
