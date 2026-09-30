import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as d3Force from 'd3-force';
import { Node, Edge, Domain } from '../../types';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS } from '../../lib/constants';

interface CanvasProps {
  onNodeClick: (node: Node) => void;
  onNodeDoubleClick: (node: Node) => void;
}

interface SimulationLink extends Edge {
  source: Node;
  target: Node;
}

interface Particle {
  sourceId: string;
  targetId: string;
  progress: number;
  speed: number;
  color: string;
}

export const KnowledgeCanvas: React.FC<CanvasProps> = ({
  onNodeClick,
  onNodeDoubleClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    setHoveredNode,
    trail,
    theme,
    warpTarget,
    clearWarp,
  } = useCuriosityStore();

  // Camera viewport transform: offset (tx, ty) and scale (zoom)
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<Node | null>(null);

  // Simulation ref
  const simulationRef = useRef<d3Force.Simulation<Node, SimulationLink> | null>(null);
  const animatedNodesRef = useRef<Node[]>([]);
  const animatedEdgesRef = useRef<SimulationLink[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: Node | null;
    edge: Edge | null;
  } | null>(null);

  // Colors based on theme
  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;
  const isDark = theme === 'observatory';

  // Parallax background stars
  const backgroundStarsRef = useRef<
    Array<{ x: number; y: number; r: number; alpha: number; layer: number }>
  >([]);

  useEffect(() => {
    // Generate static starfield background
    const stars: Array<{ x: number; y: number; r: number; alpha: number; layer: number }> = [];
    for (let i = 0; i < 220; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
        layer: Math.random() > 0.5 ? 1 : 2, // 1 = distant, 2 = near
      });
    }
    backgroundStarsRef.current = stars;
  }, []);

  // Update simulation when nodes or edges change
  useEffect(() => {
    if (nodes.length === 0) return;

    // Clone data to avoid mutating store state
    const nodeMap = new Map<string, Node>();
    const simNodes: Node[] = nodes.map((n) => {
      // Preserve existing positions if available
      const existing = animatedNodesRef.current.find((an) => an.id === n.id);
      const cloned: Node = {
        ...n,
        x: existing?.x ?? (n.x ?? (Math.random() - 0.5) * 300),
        y: existing?.y ?? (n.y ?? (Math.random() - 0.5) * 300),
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
      };
      nodeMap.set(cloned.id, cloned);
      return cloned;
    });

    const simEdges: SimulationLink[] = edges
      .map((e) => {
        const sourceNode = nodeMap.get(e.source_id);
        const targetNode = nodeMap.get(e.target_id);
        if (!sourceNode || !targetNode) return null;
        return {
          ...e,
          source: sourceNode,
          target: targetNode,
        };
      })
      .filter((e): e is SimulationLink => e !== null);

    animatedNodesRef.current = simNodes;
    animatedEdgesRef.current = simEdges;

    // Create particles for animated connections
    const newParticles: Particle[] = [];
    simEdges.forEach((e) => {
      if (['inspired', 'applies_to', 'causes'].includes(e.relation_type)) {
        const targetNode = e.target;
        const color = targetNode ? domainColors[targetNode.domain] : '#7c8cff';
        newParticles.push({
          sourceId: e.source_id,
          targetId: e.target_id,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
          color,
        });
      }
    });
    particlesRef.current = newParticles;

    // D3 Force Simulation setup
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = d3Force
      .forceSimulation<Node, SimulationLink>(simNodes)
      .force(
        'link',
        d3Force
          .forceLink<Node, SimulationLink>(simEdges)
          .id((d) => d.id)
          .distance(120)
          .strength(0.6)
      )
      .force('charge', d3Force.forceManyBody().strength(-240).distanceMax(500))
      .force('collide', d3Force.forceCollide().radius(32).strength(0.7))
      .force('center', d3Force.forceCenter(0, 0).strength(0.04))
      .alphaDecay(0.02);

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [nodes, edges, domainColors]);

  // Handle Warp Travel Animation
  useEffect(() => {
    if (!warpTarget) return;

    let animId: number;
    const startTime = performance.now();
    const duration = 1200; // ms

    const startX = transformRef.current.x;
    const startY = transformRef.current.y;
    const startK = transformRef.current.k;

    // Center camera on target node
    const targetK = 1.35;
    const targetX = -warpTarget.x * targetK;
    const targetY = -warpTarget.y * targetK;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animateWarp = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      transformRef.current.x = startX + (targetX - startX) * eased;
      transformRef.current.y = startY + (targetY - startY) * eased;
      transformRef.current.k = startK + (targetK - startK) * eased;

      if (progress < 1) {
        animId = requestAnimationFrame(animateWarp);
      } else {
        clearWarp();
      }
    };

    animId = requestAnimationFrame(animateWarp);
    return () => cancelAnimationFrame(animId);
  }, [warpTarget, clearWarp]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let pulseTime = 0;

    const render = () => {
      pulseTime += 0.025;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const { x: tx, y: ty, k } = transformRef.current;
      const centerScreenX = width / 2;
      const centerScreenY = height / 2;

      // 1. Draw Parallax Background Starfield
      ctx.save();
      ctx.translate(centerScreenX, centerScreenY);
      const stars = backgroundStarsRef.current;
      for (const s of stars) {
        const factor = s.layer === 1 ? 0.08 : 0.22;
        const px = s.x + tx * factor;
        const py = s.y + ty * factor;

        // Wrap around canvas screen bounds
        const wrapW = 2000;
        const wrapH = 2000;
        const modX = ((((px + wrapW / 2) % wrapW) + wrapW) % wrapW) - wrapW / 2;
        const modY = ((((py + wrapH / 2) % wrapH) + wrapH) % wrapH) - wrapH / 2;

        const starAlpha = isDark ? s.alpha * 0.75 : s.alpha * 0.15;
        const starColor = isDark
          ? `rgba(255, 255, 255, ${starAlpha})`
          : `rgba(40, 50, 70, ${starAlpha})`;
        ctx.fillStyle = starColor;
        ctx.beginPath();
        ctx.arc(modX, modY, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // World coordinate system transform
      ctx.save();
      ctx.translate(centerScreenX + tx, centerScreenY + ty);
      ctx.scale(k, k);

      const simNodes = animatedNodesRef.current;
      const simEdges = animatedEdgesRef.current;

      // 2. Draw Domain Nebulae (Galaxy Clusters)
      // Group nodes by domain to find center of mass
      const domainClusters: Record<string, { x: number; y: number; count: number; domain: Domain }> = {};
      simNodes.forEach((n) => {
        if (n.x === undefined || n.y === undefined) return;
        if (!domainClusters[n.domain]) {
          domainClusters[n.domain] = { x: 0, y: 0, count: 0, domain: n.domain };
        }
        domainClusters[n.domain].x += n.x;
        domainClusters[n.domain].y += n.y;
        domainClusters[n.domain].count += 1;
      });

      Object.values(domainClusters).forEach((cluster) => {
        if (cluster.count < 1) return;
        const cx = cluster.x / cluster.count;
        const cy = cluster.y / cluster.count;
        const radius = Math.max(90, cluster.count * 35);
        const col = domainColors[cluster.domain];

        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
        const alphaCenter = isDark ? 0.22 : 0.12;
        grad.addColorStop(0, col + Math.round(alphaCenter * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(0.6, col + '15');
        grad.addColorStop(1, col + '00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Semantic zoom level 1: Galaxy level label (when zoomed out)
        if (k < 0.65) {
          ctx.save();
          ctx.font = '600 14px "Inter", sans-serif';
          ctx.fillStyle = col;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cluster.domain.toUpperCase(), cx, cy);
          ctx.restore();
        }
      });

      // 3. Determine Focus Mode (Neighbors of selected or hovered node)
      const focusedNodeId = hoveredNodeId || selectedNodeId;
      const connectedNodeIds = new Set<string>();
      if (focusedNodeId) {
        connectedNodeIds.add(focusedNodeId);
        simEdges.forEach((e) => {
          if (e.source_id === focusedNodeId) connectedNodeIds.add(e.target_id);
          if (e.target_id === focusedNodeId) connectedNodeIds.add(e.source_id);
        });
      }

      // 4. Draw Connections (Threads of Light)
      simEdges.forEach((e) => {
        const sourceNode = typeof e.source === 'object' ? (e.source as Node) : null;
        const targetNode = typeof e.target === 'object' ? (e.target as Node) : null;
        if (!sourceNode || !targetNode || sourceNode.x === undefined || targetNode.x === undefined) {
          return;
        }

        const sx = sourceNode.x!;
        const sy = sourceNode.y!;
        const tx = targetNode.x!;
        const ty = targetNode.y!;

        const isTrailEdge =
          trail.includes(sourceNode.id) &&
          trail.includes(targetNode.id) &&
          Math.abs(trail.indexOf(sourceNode.id) - trail.indexOf(targetNode.id)) === 1;

        const isFocusedEdge =
          focusedNodeId &&
          (sourceNode.id === focusedNodeId || targetNode.id === focusedNodeId);

        let alpha = isDark ? 0.35 : 0.45;
        if (focusedNodeId) {
          alpha = isFocusedEdge ? (isDark ? 0.95 : 0.85) : 0.08;
        }
        if (isTrailEdge) {
          alpha = Math.max(alpha, isDark ? 0.85 : 0.75);
        }

        const sourceColor = domainColors[sourceNode.domain];
        const targetColor = domainColors[targetNode.domain];

        // Linear gradient between two star domains
        const edgeGrad = ctx.createLinearGradient(sx, sy, tx, ty);
        edgeGrad.addColorStop(0, sourceColor);
        edgeGrad.addColorStop(1, targetColor);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = edgeGrad;
        ctx.lineWidth = isTrailEdge ? 3.0 : isFocusedEdge ? 2.5 : 1.4;

        // Relation type encoding
        // solid = causes / part_of
        // dashed = analogous_to
        // dotted = contrasts_with
        if (e.relation_type === 'analogous_to') {
          ctx.setLineDash([6, 5]);
        } else if (e.relation_type === 'contrasts_with') {
          ctx.setLineDash([2, 4]);
        } else {
          ctx.setLineDash([]);
        }

        // Slight quadratic curve for organic filament feel
        const mx = (sx + tx) / 2 + (sy - ty) * 0.08;
        const my = (sy + ty) / 2 + (tx - sx) * 0.08;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, tx, ty);
        ctx.stroke();

        ctx.restore();
      });

      // 5. Draw Animated Flowing Particles along active threads
      particlesRef.current.forEach((p) => {
        const sNode = simNodes.find((n) => n.id === p.sourceId);
        const tNode = simNodes.find((n) => n.id === p.targetId);
        if (!sNode || !tNode || sNode.x === undefined || tNode.x === undefined) return;

        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const sx = sNode.x!;
        const sy = sNode.y!;
        const tx = tNode.x!;
        const ty = tNode.y!;
        const mx = (sx + tx) / 2 + (sy - ty) * 0.08;
        const my = (sy + ty) / 2 + (tx - sx) * 0.08;

        // Quadratic curve interpolation
        const t = p.progress;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * tx;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ty;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 6. Draw Concept Stars
      simNodes.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;
        const x = node.x;
        const y = node.y;

        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const isInTrail = trail.includes(node.id);
        const isConnected = !focusedNodeId || connectedNodeIds.has(node.id);

        let nodeAlpha = isConnected ? 1.0 : 0.18;
        if (node.unexplored) {
          nodeAlpha *= 0.65;
        }

        const color = domainColors[node.domain] || '#7c8cff';

        // Size based on depth explored or selection
        let baseRadius = node.is_wildcard ? 10 : 8;
        if (node.depth_explored === 'expert') baseRadius = 14;
        else if (node.depth_explored === 'undergrad') baseRadius = 12;
        else if (node.depth_explored === 'student') baseRadius = 10;
        if (isSelected) baseRadius += 3;

        ctx.save();
        ctx.globalAlpha = nodeAlpha;

        // Glow ring for explored stars / pulsing signal for unexplored stars
        if (node.unexplored) {
          const pulseR = baseRadius + Math.sin(pulseTime * 2) * 3;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, y, pulseR + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Explored star outer corona
          const coronaGrad = ctx.createRadialGradient(x, y, baseRadius * 0.5, x, y, baseRadius * 2.8);
          coronaGrad.addColorStop(0, color + '55');
          coronaGrad.addColorStop(0.6, color + '22');
          coronaGrad.addColorStop(1, color + '00');
          ctx.fillStyle = coronaGrad;
          ctx.beginPath();
          ctx.arc(x, y, baseRadius * 2.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Selection ring
        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(x, y, baseRadius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Star Core
        ctx.fillStyle = isDark ? '#ffffff' : color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 16 : isHovered ? 12 : 6;
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner domain ring if dark theme
        if (isDark) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, baseRadius * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }

        // Verified Wikipedia badge (tiny emerald dot)
        if (node.verified) {
          ctx.fillStyle = '#4ade9a';
          ctx.shadowColor = '#4ade9a';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(x + baseRadius * 0.8, y - baseRadius * 0.8, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Trail marker glow
        if (isInTrail) {
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, baseRadius + 2.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 7. Labels with Semantic Zoom
        // Constellation level (k >= 0.65) and Star level (k >= 1.1)
        if (k >= 0.65) {
          ctx.font = isSelected
            ? '600 13px "Inter", sans-serif'
            : '500 12px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Background pill for label contrast
          const labelText = node.label;
          const textMetrics = ctx.measureText(labelText);
          const bgPadding = 4;
          const bgW = textMetrics.width + bgPadding * 2;
          const bgH = 16;
          const labelY = y + baseRadius + 6;

          ctx.fillStyle = isDark ? 'rgba(11, 13, 20, 0.85)' : 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.roundRect(x - bgW / 2, labelY - 2, bgW, bgH, 4);
          ctx.fill();

          ctx.fillStyle = isSelected
            ? isDark
              ? '#ffffff'
              : '#0b0d14'
            : isDark
            ? '#e8eaf2'
            : '#1f2430';
          ctx.fillText(labelText, x, labelY);

          // Star level (zoomed in): show domain chip
          if (k >= 1.25) {
            ctx.font = '500 10px "Inter", sans-serif';
            ctx.fillStyle = color;
            ctx.fillText(node.domain.toUpperCase(), x, labelY + 16);
          }
        }

        ctx.restore();
      });

      ctx.restore();

      // Draw Canvas Minimap in screen space (bottom right)
      if (width > 600 && simNodes.length > 0) {
        const miniW = 140;
        const miniH = 100;
        const miniX = width - miniW - 24;
        const miniY = height - miniH - 24;

        ctx.save();
        ctx.fillStyle = isDark ? 'rgba(16, 19, 28, 0.75)' : 'rgba(237, 231, 220, 0.75)';
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(31, 36, 48, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(miniX, miniY, miniW, miniH, 10);
        ctx.fill();
        ctx.stroke();

        simNodes.forEach((n) => {
          if (n.x === undefined || n.y === undefined) return;
          const mx = miniX + miniW / 2 + (n.x / 1400) * (miniW / 2);
          const my = miniY + miniH / 2 + (n.y / 1400) * (miniH / 2);
          if (mx >= miniX && mx <= miniX + miniW && my >= miniY && my <= miniY + miniH) {
            ctx.fillStyle = domainColors[n.domain];
            ctx.beginPath();
            ctx.arc(mx, my, n.id === selectedNodeId ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [domainColors, isDark, selectedNodeId, hoveredNodeId, trail]);

  // Canvas Resize observer
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen to World coordinates helper
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const { x: tx, y: ty, k } = transformRef.current;
    return {
      x: (screenX - rect.left - centerX - tx) / k,
      y: (screenY - rect.top - centerY - ty) / k,
    };
  }, []);

  // Find node or edge under mouse
  const getNodeAtPosition = useCallback(
    (screenX: number, screenY: number): Node | null => {
      const world = screenToWorld(screenX, screenY);
      const simNodes = animatedNodesRef.current;
      for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        if (n.x === undefined || n.y === undefined) continue;
        const dx = world.x - n.x;
        const dy = world.y - n.y;
        const radius = (n.radius || 12) + 6;
        if (dx * dx + dy * dy <= radius * radius) {
          return n;
        }
      }
      return null;
    },
    [screenToWorld]
  );

  // Mouse / Wheel / Drag Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickedNode = getNodeAtPosition(e.clientX, e.clientY);
    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart();
      }
      clickedNode.fx = clickedNode.x;
      clickedNode.fy = clickedNode.y;
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (draggedNodeRef.current) {
      const world = screenToWorld(e.clientX, e.clientY);
      draggedNodeRef.current.fx = world.x;
      draggedNodeRef.current.fy = world.y;
      return;
    }

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover detection
    const hoveredNode = getNodeAtPosition(e.clientX, e.clientY);
    if (hoveredNode) {
      setHoveredNode(hoveredNode.id);
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        node: hoveredNode,
        edge: null,
      });
      if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
    } else {
      setHoveredNode(null);
      setTooltip(null);
      if (canvasRef.current) canvasRef.current.style.cursor = isDraggingRef.current ? 'grabbing' : 'default';
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      if (simulationRef.current) {
        simulationRef.current.alphaTarget(0);
      }
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtPosition(e.clientX, e.clientY);
    if (node) {
      onNodeClick(node);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtPosition(e.clientX, e.clientY);
    if (node) {
      onNodeDoubleClick(node);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const currentK = transformRef.current.k;
    const newK = Math.max(0.25, Math.min( currentK * zoomFactor, 3.5));

    // Zoom centered on cursor position
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    transformRef.current.x = mouseX - ((mouseX - transformRef.current.x) * newK) / currentK;
    transformRef.current.y = mouseY - ((mouseY - transformRef.current.y) * newK) / currentK;
    transformRef.current.k = newK;
  };

  // Center & Fit View Helper
  const fitView = useCallback(() => {
    const simNodes = animatedNodesRef.current;
    if (simNodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    simNodes.forEach((n) => {
      if (n.x === undefined || n.y === undefined) return;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const scaleX = rect.width / graphWidth;
    const scaleY = rect.height / graphHeight;
    const newK = Math.max(0.4, Math.min(scaleX, scaleY, 1.2));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    transformRef.current = {
      x: -centerX * newK,
      y: -centerY * newK,
      k: newK,
    };
  }, []);

  // Expose fit view to keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        fitView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {/* Floating Hover Tooltip */}
      {tooltip && tooltip.node && (
        <div
          className="fixed pointer-events-none z-50 px-3 py-2 rounded-lg text-xs glass-panel shadow-xl transform -translate-x-1/2 -translate-y-full -mt-3 max-w-xs transition-opacity duration-150"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="flex items-center gap-1.5 font-semibold text-sm mb-1 text-white">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: domainColors[tooltip.node.domain],
              }}
            />
            {tooltip.node.label}
            {tooltip.node.verified && (
              <span className="text-[10px] text-emerald-400 font-mono">
                ✓ wiki
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-300 leading-tight">
            {tooltip.node.summary_short}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
            <span className="capitalize">{tooltip.node.domain}</span>
            <span>Double-click to expand</span>
          </div>
        </div>
      )}
    </div>
  );
};
