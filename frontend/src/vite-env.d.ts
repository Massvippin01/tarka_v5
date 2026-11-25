/// <reference types="vite/client" />

declare module '@xyflow/react' {
  import * as React from 'react';
  export type Node<T = any> = {
    id: string;
    position: { x: number; y: number };
    data: T;
    [key: string]: any;
  };
  export type Edge<T = any> = {
    id: string;
    source: string;
    target: string;
    label?: string | React.ReactNode;
    [key: string]: any;
  };
  export const ReactFlow: React.ComponentType<any>;
  export const Background: React.ComponentType<any>;
  export const Controls: React.ComponentType<any>;
  export const MiniMap: React.ComponentType<any>;
  export const useNodesState: any;
  export const useEdgesState: any;
  export const addEdge: any;
}
