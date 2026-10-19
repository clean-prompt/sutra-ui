import * as React from "react";

/** True inside a list of rows (`ItemGroup`, `FramePanel`): an `Item` then carries list-item semantics. Private. */
export const ItemListContext = React.createContext(false);
