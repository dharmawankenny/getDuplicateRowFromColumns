import React, { useState, useCallback } from "react";
import Papa from "papaparse";
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
      <h1>Get Duplicated Rows</h1>
      <p>Upload CSV file to process down below</p>
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
    return data.filter((d) => d[cI]).map((d) => sanitizeString(d[cI]));
  });
  const deletedColumns = [];
  let maxDeletedRows = 0;
  const uniqueColumns = columns.map((col) => {
    const count = {};
    col.forEach((c) => {
      if (count[c]) {
        count[c] = count[c] + 1;
      } else {
        count[c] = 1;
      }
    });
    const unique = Object.keys(count);
    const duplicates = [];
    Object.entries(count)
      .filter(([_, num]) => num > 1)
      .forEach(([c, num]) => {
        for (let i = 1; i < num; i++) {
          duplicates.push(c);
        }
      });
    deletedColumns.push(duplicates);
    if (duplicates.length > maxDeletedRows) maxDeletedRows = duplicates.length;
    return unique;
  });

  const rows = [];
  const colMap = new Array(uniqueColumns.length).fill({});

  uniqueColumns.forEach((column, cI) => {
    const prefix = new Array(cI).fill("");
    column.forEach((c) => {
      if (!colMap[cI][c]) {
        colMap[cI][c] = true;
        const nextCols = [];

        for (let i = cI + 1; i < uniqueColumns.length; i++) {
          const nextColumn = uniqueColumns[i];
          const match = nextColumn.find((n) => n === c);

          if (match) {
            nextCols.push(match);
            uniqueColumns[i] = uniqueColumns[i].filter((n) => n !== c);
          } else {
            nextCols.push(false);
          }
        }

        rows.push([
          ...prefix,
          c,
          ...nextCols.map((nextCol) => {
            if (nextCol) return nextCol;

            return "";
          })
        ]);
      }
    });
  });
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

function sanitizeString(str) {
  return str
    .replace(/\./g, "")
    .replace(/,/g, "")
    .split(" ")
    .filter((w) => w)
    .join(" ")
    .toUpperCase();
}

function download(data) {
  alert(data);
  const blob = new Blob([Papa.unparse(data)], {
    type: "text/csv;charset=utf-8;"
  });
  saveAs(blob, "results.csv");
}
