import React, { useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import api from "../api";

const initialNodes: Node[] = [
  {
    id: "lb",
    data: { label: "LB" },
    position: { x: 0, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "192.168.1.1",
    data: { label: "192.168.1.1: 0" },
    position: { x: 200, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "192.168.1.2",
    data: { label: "192.168.1.2: 0" },
    position: { x: 200, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "192.168.1.3",
    data: { label: "192.168.1.3: 0" },
    position: { x: 200, y: 200 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
  {
    id: "service",
    data: { label: "Service" },
    position: { x: 400, y: 100 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  },
];

const initialEdges: Edge[] = [
  {
    id: "e-lb-192.168.1.1",
    source: "lb",
    target: "192.168.1.1",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e-lb-192.168.1.2",
    source: "lb",
    target: "192.168.1.2",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e-lb-192.168.1.3",
    source: "lb",
    target: "192.168.1.3",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e-192.168.1.1-service",
    source: "192.168.1.1",
    target: "service",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e-192.168.1.2-service",
    source: "192.168.1.2",
    target: "service",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e-192.168.1.3-service",
    source: "192.168.1.3",
    target: "service",
    type: "smoothstep",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

type Algorithm = "round_robin" | "random" | "least_connections";

interface Stats {
  [key: string]: number;
}

function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [algorithm, setAlgorithm] = useState<Algorithm>("round_robin");
  const [result] = useState<string>("");
  const [requestsPerSecond, setRequestsPerSecond] = useState<number>(1);
  const [isLoadTesting, setIsLoadTesting] = useState<boolean>(false);
  const [results, setResults] = useState<string[]>([]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const setLoadBalancingAlgorithm = async (newAlgorithm: Algorithm) => {
    await api.get(`/set_algorithm/${newAlgorithm}`);
    setAlgorithm(newAlgorithm);
  };

  const sendRequest = async () => {
    try {
      const response = await api.get("/get_ip");
      const {
        ip,
        message,
        stats,
      }: { ip: string; message: string; stats: Stats } = response.data;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id.startsWith("192.168.")) {
            return {
              ...node,
              data: {
                ...node.data,
                label: `${node.id}: ${stats[node.id]}`,
              },
              style:
                node.id === ip.toLowerCase() ? { background: "#4CAF50" } : {},
            };
          }
          return node;
        })
      );

      setResults((prevResults) => [
        ...prevResults,
        `Request handled by ${ip}. Response: "${message}"`,
      ]);
    } catch (error) {
      console.error("Error sending request:", error);
      setResults((prevResults) => [...prevResults, `Error: ${error}`]);
    }
  };
  const runLoadTest = async (duration: number = 10) => {
    setIsLoadTesting(true);
    setResults([]);
    const interval = 1000 / requestsPerSecond;
    let counter = 0;

    const sendRequests = async () => {
      if (counter < duration * requestsPerSecond) {
        await sendRequest();
        counter++;
        setTimeout(sendRequests, interval);
      } else {
        setIsLoadTesting(false);
        console.log("Load test completed");
      }
    };

    sendRequests();
  };

  const generateIPAddress = (existingIPs: string[]): string => {
    const baseIP = "192.168.1";
    let newIP = `${baseIP}.${Math.floor(Math.random() * 256)}`;

    // Ensure the new IP is unique
    while (existingIPs.includes(newIP)) {
      newIP = `${baseIP}.${Math.floor(Math.random() * 256)}`;
    }

    return newIP;
  };

  const addNewIP = async () => {
    const existingIPs = nodes
      .filter((node) => node.id.startsWith("192.168."))
      .map((node) => node.id); // Adjust this condition based on your IP range
    const newIP = generateIPAddress(existingIPs);

    const newNode: Node = {
      id: newIP,
      data: { label: `${newIP}: 0` },
      position: { x: 200, y: existingIPs.length * 100 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    const newEdgeFromLB: Edge = {
      id: `e-lb-${newIP}`,
      source: "lb",
      target: newIP,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    const newEdgeToService: Edge = {
      id: `e-${newIP}-service`,
      source: newIP,
      target: "service",
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    setNodes((prevNodes) => [...prevNodes, newNode]);
    setEdges((prevEdges) => [...prevEdges, newEdgeFromLB, newEdgeToService]);

    try {
      await api.post("/add_ip", { ip: newIP });
    } catch (error) {
      console.error("Failed to add new IP to backend:", error);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          padding: "20px",
          backgroundColor: "#f0f0f0",
          borderBottom: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            margin: "0 0 15px 0",
            color: "#333",
            fontSize: "24px",
          }}
        >
          [Circulate] Load Balancer Visualization
        </h2>
        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={() => setLoadBalancingAlgorithm("round_robin")}
            style={buttonStyle(algorithm === "round_robin")}
          >
            Round Robin
          </button>
          <button
            onClick={() => setLoadBalancingAlgorithm("random")}
            style={buttonStyle(algorithm === "random")}
          >
            Random
          </button>
          <button
            onClick={() => setLoadBalancingAlgorithm("least_connections")}
            style={buttonStyle(algorithm === "least_connections")}
          >
            Least Connections
          </button>
          <button
            onClick={sendRequest}
            style={{
              ...buttonStyle(false),
              backgroundColor: "#4CAF50",
              color: "white",
            }}
          >
            Send Request
          </button>
          <button
            onClick={addNewIP}
            style={{
              ...buttonStyle(false),
              backgroundColor: "#007bff",
              color: "white",
            }}
          >
            Add IP
          </button>
          <button
            onClick={() => setResults([])}
            style={{
              ...buttonStyle(false),
              backgroundColor: "#dc3545",
              color: "white",
            }}
          >
            Clear Results
          </button>
        </div>
        <div style={{ fontSize: "16px", color: "#555" }}>
          Active Algorithm:{" "}
          <span style={{ fontWeight: "bold", color: "#333" }}>
            {algorithm.replace("_", " ")}
          </span>
        </div>
        <div style={{ marginTop: "10px", fontSize: "16px", color: "#555" }}>
          {result}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <input
          type="number"
          value={requestsPerSecond}
          onChange={(e) =>
            setRequestsPerSecond(Math.max(1, Number(e.target.value)))
          }
          min="1"
          max="100"
          style={{ marginRight: "10px", width: "50px" }}
        />
        <span style={{ marginRight: "10px" }}>requests per second</span>
        <button
          onClick={() => runLoadTest(10)}
          style={{
            ...buttonStyle(false),
            backgroundColor: "#ff7f50",
            color: "white",
          }}
          disabled={isLoadTesting}
        >
          {isLoadTesting ? "Testing..." : "Run 10s Load Test"}
        </button>
      </div>
      <div
        style={{
          marginTop: "10px",
          fontSize: "14px",
          color: "#555",
          maxHeight: "100px",
          overflowY: "auto",
        }}
      >
        {results.map((result, index) => (
          <div key={index}>{result}</div>
        ))}
      </div>
    </div>
  );
}

// Button style function
const buttonStyle = (isActive: boolean) => ({
  padding: "10px 15px",
  margin: "0 10px 0 0",
  fontSize: "14px",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  backgroundColor: isActive ? "#007bff" : "#ffffff",
  color: isActive ? "#ffffff" : "#333333",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  transition: "all 0.3s ease",
});

export default App;
