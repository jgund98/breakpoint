"use client";

import { useState } from "react";
import type { CascadeResult } from "@/lib/cascade";
import type { Matrix } from "@/lib/matrix";
import { ExposureMatrix } from "./ExposureMatrix";
import { CascadeBoard } from "./CascadeBoard";
import { Note } from "./ui";

/**
 * Matrix on top, cascade underneath, one selection between them.
 * Pick an operator from the grid and the failure model below redraws.
 */
export function ExposureView({
  matrix,
  cascades,
}: {
  matrix: Matrix;
  cascades: CascadeResult[];
}) {
  const modelled = new Set(cascades.map((c) => c.operator));
  const first =
    matrix.operators.find((o) => modelled.has(o.operator))?.operator ??
    cascades[0]?.operator ??
    "";

  const [active, setActive] = useState(first);

  const select = (operator: string) => {
    if (modelled.has(operator)) setActive(operator);
  };

  return (
    <div className="space-y-4">
      <div className="card-enter d-1">
        <ExposureMatrix matrix={matrix} active={active} onSelect={select} />
      </div>

      <Note tone="petrol" title="From concentration to consequence">
        The grid above is your exposure. The model below is what happens if you
        lose one of them. Select any row to redraw it.
      </Note>

      <div className="card-enter d-3">
        <CascadeBoard
          cascades={cascades}
          active={active}
          onSelect={select}
          hidePicker
        />
      </div>
    </div>
  );
}
