import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { deleteBracketPair as fn } from '@codemirror/autocomplete';

export const deleteBracketPair = Prec.high(keymap.of([{ key: 'Backspace', run: fn }]));
