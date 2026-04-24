export interface ParsedArgs {
  command: string | null;
  positionals: string[];
  options: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }

    const optionName = value.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[optionName] = true;
      continue;
    }

    options[optionName] = next;
    index += 1;
  }

  return {
    command: command ?? null,
    positionals,
    options,
  };
}
