const nameParticles = new Set([
  'da', 'das', 'de', 'del', 'dela', 'delas', 'di', 'do', 'dos', 'du',
  'la', 'las', 'le', 'los', 'san', 'santa', 'st', 'van', 'von'
]);

const nameSuffixes = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

export type StudentNameOrder = 'auto' | 'given-first' | 'surname-first';

const titleCaseName = (name: string) =>
  name.toLocaleLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, separator: string, letter: string) =>
    `${separator}${letter.toLocaleUpperCase()}`
  );

const isSuffix = (token: string) => nameSuffixes.has(token.replace(/[.,]/g, '').toLocaleLowerCase());

const formatSuffix = (suffix: string) => {
  const normalizedSuffix = suffix.replace(/[.,]/g, '').toLocaleLowerCase();
  if (normalizedSuffix === 'jr' || normalizedSuffix === 'sr') {
    return `${titleCaseName(normalizedSuffix)}.`;
  }
  if (nameSuffixes.has(normalizedSuffix)) {
    return normalizedSuffix.toLocaleUpperCase();
  }
  return titleCaseName(suffix);
};

const takeSuffix = (tokens: string[]) => {
  if (tokens.length > 1 && isSuffix(tokens[tokens.length - 1])) {
    return { tokens: tokens.slice(0, -1), suffix: tokens[tokens.length - 1].replace(/[.,]/g, '') };
  }
  return { tokens, suffix: '' };
};

const formatGivenNames = (tokens: string[]) => {
  if (tokens.length === 0) return '';
  return tokens.map(token => {
    const cleanToken = token.replace(/[.,]+$/, '');
    if (Array.from(cleanToken).length === 1 && /[.,]$/.test(token)) {
      return `${cleanToken.toLocaleUpperCase()}.`;
    }
    return titleCaseName(cleanToken);
  }).filter(Boolean).join(' ');
};

export function normalizeStudentName(rawName: string, order: StudentNameOrder = 'auto'): string {
  const name = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!name) return '';

  const commaIndex = name.indexOf(',');
  let surname: string;
  let givenNameTokens: string[];
  let suffix = '';

  if (commaIndex >= 0) {
    const parsedSurname = takeSuffix(name.slice(0, commaIndex).trim().split(/\s+/).filter(Boolean));
    surname = parsedSurname.tokens.join(' ');
    const givenNames = name.slice(commaIndex + 1).replace(/,/g, ' ').trim();
    const parsedGivenNames = takeSuffix(givenNames.split(/\s+/).filter(Boolean));
    givenNameTokens = parsedGivenNames.tokens;
    suffix = parsedGivenNames.suffix || parsedSurname.suffix;
  } else if (order === 'surname-first') {
    const parsed = takeSuffix(name.split(/\s+/).filter(Boolean));
    const tokens = parsed.tokens;
    suffix = parsed.suffix;
    surname = tokens[0] || '';
    givenNameTokens = tokens.slice(1);
  } else {
    const parsed = takeSuffix(name.split(/\s+/).filter(Boolean));
    const tokens = parsed.tokens;
    suffix = parsed.suffix;

    if (tokens.length <= 1) {
      return titleCaseName(tokens[0] || '');
    }

    let surnameStart = tokens.length - 1;
    while (surnameStart > 0 && nameParticles.has(tokens[surnameStart - 1].replace(/[.,]/g, '').toLocaleLowerCase())) {
      surnameStart--;
    }
    surname = tokens.slice(surnameStart).join(' ');
    givenNameTokens = tokens.slice(0, surnameStart);
  }

  const formattedSurname = titleCaseName(surname);
  const formattedGivenNames = formatGivenNames(givenNameTokens);
  const formattedSuffix = suffix ? formatSuffix(suffix) : '';
  if (!formattedSurname) return [formattedGivenNames, formattedSuffix].filter(Boolean).join(' ');
  if (!formattedGivenNames) return [formattedSurname, formattedSuffix].filter(Boolean).join(' ');
  return `${formattedSurname}, ${formattedGivenNames}${formattedSuffix ? ` ${formattedSuffix}` : ''}`;
}
