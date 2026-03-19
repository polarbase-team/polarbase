import * as fs from 'fs/promises';
import * as path from 'path';

const SKILLS_DIR = path.resolve(
  process.cwd(),
  process.env.AGENT_SANDBOX_WORKING_DIR || '.agents',
  'skills'
);

let discoveredSkills: SkillMetadata[] | undefined;

export interface SkillMetadata {
  name: string;
  description: string;
  path: string;
}

/**
 * Scan one or more directories for skill folders.
 * Each skill folder must contain a SKILL.md with YAML frontmatter
 * that declares `name` and `description`.
 *
 * First skill with a given name wins (allows project-level overrides).
 */
export async function discoverSkills(directories: string[]) {
  const skills: SkillMetadata[] = [];
  const seenNames = new Set<string>();

  for (const dir of directories) {
    let entries: { name: string; isDirectory(): boolean }[];
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any;
    } catch {
      continue; // directory doesn't exist — skip silently
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(dir, entry.name);
      const skillFile = path.join(skillDir, 'SKILL.md');

      try {
        const content = await fs.readFile(skillFile, 'utf-8');
        const frontmatter = parseFrontmatter(content);

        if (seenNames.has(frontmatter.name)) continue;
        seenNames.add(frontmatter.name);

        skills.push({
          name: frontmatter.name,
          description: frontmatter.description,
          path: skillDir,
        });
      } catch {
        continue; // missing or invalid SKILL.md — skip
      }
    }
  }

  return skills;
}

/**
 * Get discovered skills
 */
export async function getDiscoveredSkills() {
  if (!discoveredSkills) {
    discoveredSkills = await discoverSkills([SKILLS_DIR]);
  }
  return discoveredSkills || [];
}

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Supports simple `key: value` pairs (no nested YAML).
 */
export function parseFrontmatter(content: string): {
  name: string;
  description: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) throw new Error('No frontmatter found');

  const lines = match[1].split('\n');
  const data: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    data[key] = value;
  }

  if (!data.name || !data.description) {
    throw new Error('Frontmatter must include name and description');
  }

  return {
    name: data.name,
    description: data.description,
  };
}

/**
 * Strip YAML frontmatter from content, returning only the body.
 */
export function stripFrontmatter(content: string) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

/**
 * Generate the system prompt section that lists available skills.
 */
export function buildSkillsPrompt(skills: SkillMetadata[]) {
  if (skills.length === 0) return '';

  const skillsList = skills
    .map((s) => `- ${s.name}: ${s.description}`)
    .join('\n');

  return `
## Skills

You have access to specialized skills. Use the \`loadSkill\` tool to load a skill's
full instructions when the user's request matches a skill description.
After loading, you can use \`executeSkillScript\` to run bundled scripts.

Available skills:
${skillsList}
`;
}
