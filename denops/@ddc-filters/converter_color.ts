import { BaseFilter } from "jsr:@shougo/ddc-vim@~7.1.0/filter";
import type { Item } from "jsr:@shougo/ddc-vim@~7.1.0/types";
import type { Denops } from "jsr:@denops/core@~7.0.1";
import type { CompletionItem } from "npm:vscode-languageserver-types@3.17.5";
import { nvim_set_hl } from "jsr:@denops/std@~7.2.0/function/nvim";
import { ColorTranslator } from "npm:colortranslator@4.1.0";

type Params = {
  symbol: string;
  matchKind: string;
  strictMatch: boolean;
};

interface UserDataRaw {
  lspitem: string;
}

export class Filter extends BaseFilter<Params> {
  override filter(args: {
    denops: Denops;
    filterParams: Params;
    items: Item[];
  }): Promise<Item[]> {
    const { symbol, matchKind, strictMatch } = args.filterParams;
    const encoder = new TextEncoder();
    for (const item of args.items) {
      if (
        strictMatch ? item.kind !== matchKind : !item.kind?.includes(matchKind)
      ) {
        continue;
      }

      const lspItem = JSON.parse(
        (item.user_data as UserDataRaw).lspitem,
      ) as CompletionItem;
      const itemDoc = lspItem.documentation;

      if (!itemDoc || typeof itemDoc !== "string") {
        continue;
      }

      const color_hex = normalizeColor(itemDoc);

      if (!color_hex) {
        continue;
      }

      const hlGroup = `lsp-color-${color_hex.replace("#", "")}`;

      nvim_set_hl(args.denops, 0, hlGroup, {
        fg: color_hex,
        default: true,
      });

      item.highlights = [
        ...(item.highlights ?? []),
        {
          name: hlGroup,
          type: "abbr",
          hl_group: hlGroup,
          col: 1,
          width: encoder.encode(symbol).length,
        },
      ];

      item.abbr = `${symbol} ${item.abbr}`;
    }

    return Promise.resolve(args.items);
  }

  override params(): Params {
    return {
      symbol: "■",
      matchKind: "Color",
      strictMatch: false,
    };
  }
}

function normalizeColor(color: string): string | null {
  try {
    return ColorTranslator.toHEX(color);
  } catch (_e) {
    return null;
  }
}
