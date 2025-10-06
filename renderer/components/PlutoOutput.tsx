/** @jsxImportSource preact */

interface PlutoOutputProps {
  output: {
    mime: string;
    body: string | Uint8Array;
  };
}

export function PlutoOutput({ output }: PlutoOutputProps) {
  const decodeBody = (body: string | Uint8Array): string => {
    if (typeof body === "string") {
      return body;
    }
    // Handle Uint8Array or plain object that looks like Uint8Array
    if (body instanceof Uint8Array) {
      return new TextDecoder().decode(body);
    }
    // If it's a plain object with numeric keys (serialized Uint8Array)
    if (typeof body === "object" && body !== null) {
      const arr = new Uint8Array(Object.values(body));
      return new TextDecoder().decode(arr);
    }
    return String(body);
  };

  switch (output.mime) {
    case "image/png":
    case "image/jpg":
    case "image/jpeg":
    case "image/gif":
    case "image/bmp":
    case "image/svg+xml": {
      const decoded = decodeBody(output.body);
      return <div dangerouslySetInnerHTML={{ __html: decoded }} />;
    }

    case "text/plain": {
      const text = decodeBody(output.body);
      return <pre>{text}</pre>;
    }

    case "text/html": {
      const html = decodeBody(output.body);
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    case "application/vnd.pluto.tree+object": {
      return <PlutoTree data={output.body} />;
    }

    case "application/vnd.pluto.table+object": {
      return <PlutoTable data={output.body} />;
    }

    case "application/vnd.pluto.parseerror+object": {
      return <PlutoParseError data={output.body} />;
    }

    case "application/vnd.pluto.stacktrace+object": {
      return <PlutoStackTrace data={output.body} />;
    }

    case "application/vnd.pluto.divelement+object": {
      return <PlutoDivElement data={output.body} />;
    }

    default: {
      const content = decodeBody(output.body);
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
  }
}

// Placeholder components for Pluto-specific types
// TODO: Implement proper rendering based on Pluto's data structures

function decodeData(data: string | Uint8Array | any): string {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof Uint8Array) {
    return new TextDecoder().decode(data);
  }
  // If it's a plain object with numeric keys (serialized Uint8Array)
  if (typeof data === "object" && data !== null) {
    const arr = new Uint8Array(Object.values(data));
    return new TextDecoder().decode(arr);
  }
  return String(data);
}

function PlutoTree({ data }: { data: string | Uint8Array }) {
  const text = decodeData(data);
  return (
    <div class="pluto-tree">
      <pre>{text}</pre>
    </div>
  );
}

function PlutoTable({ data }: { data: string | Uint8Array }) {
  const text = decodeData(data);
  return (
    <div class="pluto-table">
      <pre>{text}</pre>
    </div>
  );
}

function PlutoParseError({ data }: { data: string | Uint8Array }) {
  const text = decodeData(data);
  return (
    <div class="pluto-error" style={{ color: "red" }}>
      <pre>{text}</pre>
    </div>
  );
}

function PlutoStackTrace({ data }: { data: string | Uint8Array }) {
  const text = decodeData(data);
  return (
    <div class="pluto-stacktrace" style={{ color: "red" }}>
      <pre>{text}</pre>
    </div>
  );
}

function PlutoDivElement({ data }: { data: string | Uint8Array }) {
  const text = decodeData(data);
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}
