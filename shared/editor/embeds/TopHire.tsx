import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function TopHire(props: Props) {
  let url;
  try {
    url = new URL(props.attrs.href);
  } catch {
    // noop
  }

  return <Frame {...props} src={`${url.href}`} title={`Video`} />;
}

TopHire.ENABLED = [new RegExp("^https?://video\\.tophire\\.co/(.*)$")];

export default TopHire;
