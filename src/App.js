import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import Fuse from "fuse.js";
import { saveAs } from "file-saver";
import "./styles.css";

export default function App() {
  const [data, setData] = useState();
  const [disabled, setDisabled] = useState(true);
  const onChange = useCallback(
    (evt) => {
      if (evt.target.files && evt.target.files[0]) {
        Papa.parse(evt.target.files[0], {
          complete: (res) => {
            const parsed = parse(res.data);
            setData(parsed);
            setDisabled(false);
          }
        });
      }
    },
    [setData]
  );

  return (
    <div className="App">
      <input type="file" onChange={onChange} />
      <button disabled={disabled} onClick={() => download(data)}>
        Download File
      </button>
    </div>
  );
}

function parse(rowsRaw) {
  const data = rowsRaw.slice(1);
  const columns = rowsRaw[0].map((c, cI) => {
    return data.filter((d) => d[cI]).map((d) => d[cI]);
  });
  const deletedColumns = [];
  let maxDeletedRows = 0;
  const colFuz = [];
  const uniqueColumns = columns.map((col) => {
    const fuzzy = new Fuse([...col], { threshold: 0.15 });
    const deleted = [];
    const dupes = {};
    const result = col.filter((c) => {
      const fuzzyRes = fuzzy.search(c).map((res) => res.item);
      if (fuzzyRes.length === 1) {
        return true;
      }

      const isDupe = Object.entries(dupes).find(([dupeLead, dupeLists]) => {
        if (c === dupeLead) return true;
        if (dupeLists.includes(c)) return true;
        return false;
      });

      if (!isDupe) {
        dupes[c] = fuzzyRes;
        return true;
      }

      deleted.push(c);
      return false;
    });
    colFuz.push(new Fuse([...result], { threshold: 0.15 }));
    deletedColumns.push(deleted);
    if (deleted.length > maxDeletedRows) maxDeletedRows = deleted.length;
    return result;
  });

  const rows = [];
  const colMap = new Array(uniqueColumns.length).fill({});

  uniqueColumns.forEach((column, cI) => {
    const prefix = new Array(cI).fill("");
    column.forEach((c) => {
      if (!colMap[cI][c]) {
        colMap[cI][c] = true;
        const nextCols = [];
        let maxRows = 0;

        for (let i = cI + 1; i < colFuz.length; i++) {
          const fuzz = colFuz[i];
          const fuzzRes = fuzz.search(c).map((res) => res.item);

          if (fuzzRes.length > 0) {
            maxRows = maxRows > fuzzRes.length ? maxRows : fuzzRes.length;
            nextCols.push(fuzzRes);
            fuzz.remove((i) => fuzzRes.includes(i));
          } else {
            nextCols.push([]);
          }
        }

        for (let i = 0; i < maxRows; i++) {
          alert(nextCols);
          rows.push([
            ...prefix,
            c,
            ...nextCols.map((nextCol) => {
              if (nextCol[i]) return nextCol[i];

              return "";
            })
          ]);
        }
      }
    });
  });

  alert("rows");
  alert(rows);

  rows.push([" "]);
  rows.push([" "]);
  rows.push([" "]);
  rows.push(["DUPLICATES IN THE SAME COLUMN"]);
  rows.push([" "]);
  for (let i = 0; i < maxDeletedRows; i++) {
    rows.push(
      deletedColumns.map((delCol) => {
        if (delCol[i]) return delCol[i];
        return "";
      })
    );
  }

  return [rowsRaw[0], ...rows];
}

function download(data) {
  alert(data);
  const blob = new Blob([Papa.unparse(data)], {
    type: "text/csv;charset=utf-8;"
  });
  saveAs(blob, "results.csv");
}
