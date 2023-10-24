import type { Extension } from '@codemirror/state';
import type { TagStyle } from '@codemirror/language';
import {
  HighlightStyle,
  syntaxHighlighting as highlighting,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { StyleSpec } from 'style-mod';
import { ThemeVersion } from '@replit/extensions';
import createTheme from '@uiw/codemirror-themes';

type TagModifier =
  | 'definition'
  | 'constant'
  | 'function'
  | 'standard'
  | 'local'
  | 'special'

type TagName = Exclude<keyof typeof tags, TagModifier>;

export interface Tag {
  name: TagName;
  modifiers?: Array<TagModifier>;
}

export interface SyntaxHighlightingSpec {
  tags: Array<Tag>;
  values: StyleSpec;
}


function tagStyleSpecToCMStyle(style: SyntaxHighlightingSpec): TagStyle {
  const tag = style.tags.map((t) => {
    let ext = tags[t.name];

    if (!t.modifiers) {
      return ext;
    }

    t.modifiers.forEach((modifier) => {
      const mod = tags[modifier];
      ext = mod(ext);
    });

    return ext;
  });

  let sanitizedRuiValues;

  if (style.values.color && style.values.color.toString().includes('--accent-') && !style.values.color.toString().includes('primary') && !style.values.color.toString().includes('negative') && !style.values.color.toString().includes('positive')) {
    // alert('hi')
    const color = style.values.color.toString().replace('accent-', '');

    sanitizedRuiValues = {
      ...style.values,
      color
    };
  }

  return {
    tag,
    ...sanitizedRuiValues,
  };
}

export const tagsFromSpecs = (specs: Array<SyntaxHighlightingSpec>) => {
  const styles = specs.map((tag) => tagStyleSpecToCMStyle(tag));
  return styles
}

export const highlightStyleFromSpecs = (
  specs: Array<SyntaxHighlightingSpec>,
): HighlightStyle => {
  const styles = specs.map((tag) => tagStyleSpecToCMStyle(tag));

  return HighlightStyle.define(styles);
  // return styles;
}

export default function syntaxHighlighting(
  specs: Array<SyntaxHighlightingSpec>,
): Extension {
  return highlighting(highlightStyleFromSpecs(specs));
}

export const createThemeExtension = (replitTheme: ThemeVersion) => {
  const { colorScheme, values } = replitTheme;
  const styles = tagsFromSpecs(values.editor.syntaxHighlighting);

  const theme = createTheme({
    theme: colorScheme,
    settings: {
      background: 'var(--background-default)',
      foreground: 'var(--foreground-default)',
      caret: 'var(--accent-primary-stronger)',
      selection: 'var(--accent-primary-dimmest)',
      selectionMatch: 'var(--background-highest)',
      lineHighlight: `var(--background-higher)`,
      gutterBackground: 'var(--background-default)',
      gutterForeground: 'var(--foreground-dimmer)',
    },
    styles,
  });

  return theme;
};