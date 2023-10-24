import React, { useEffect, useState } from 'react'
import ReactJson from '@microlink/react-json-view'
import { useTheme, useThemeValues } from '@replit/extensions-react'


export function ResultView({ result }: { result: any }) {
  const replitTheme = useTheme();

  const [theme, setTheme] = useState({
    base00: "#282c34",
    base01: "#353b45",
    base02: "#3e4451",
    base03: "#545862",
    base04: "#565c64",
    base05: "#abb2bf",
    base06: "#b6bdca",
    base07: "#c8ccd4",
    base08: "#e06c75",
    base09: "#d19a66",
    base0A: "#e5c07b",
    base0B: "#98c379",
    base0C: "#56b6c2",
    base0D: "#61afef",
    base0E: "#c678dd",
    base0F: "#be5046"
  })

  useEffect(() => {
    if (replitTheme && replitTheme.values) {
      const { global } = replitTheme.values;

      setTheme({
        base00: global.backgroundDefault,
        base01: global.backgroundDefault,
        base02: global.backgroundHigher,
        base03: global.backgroundHighest,
        base04: global.backgroundHighest,
        base05: global.foregroundDefault,
        base06: global.foregroundDefault,
        base07: global.foregroundDefault,
        base08: global.redStronger,
        base09: global.orangeStrongest,
        base0A: global.yellowStronger,
        base0B: global.greenStrongest,
        base0C: global.tealStrongest,
        base0D: global.blueStrongest,
        base0E: global.pinkStrongest,
        base0F: global.redStrongest
      })

    }
  }, [replitTheme])

  return (
    <div className="overflow-y-scroll">
      <ReactJson
        collapseStringsAfterLength={20}
        style={{
          fontSize: 14
        }}
        collapsed={2}
        src={result}
        theme={theme}
      />
    </div>
  )
}