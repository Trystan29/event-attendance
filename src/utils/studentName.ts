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

export const studentNameTokens = (name: string) =>
  normalizeStudentName(name)
    .replace(/\uFFFD/g, 'n')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .match(/[a-z0-9]+/g) || [];

const hasOneCharacterDifference = (left: string, right: string) => {
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let differences = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }

    differences++;
    if (differences > 1) return false;
    if (left.length > right.length) leftIndex++;
    else if (right.length > left.length) rightIndex++;
    else {
      leftIndex++;
      rightIndex++;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) differences++;
  return differences === 1;
};

export const studentNamesMatch = (leftName: string, rightName: string, allowTypo = false) => {
  const getParts = (name: string) => {
    const normalizedName = normalizeStudentName(name);
    const commaIndex = normalizedName.indexOf(',');
    if (commaIndex < 0) return { surname: [], given: studentNameTokens(normalizedName) };
    return {
      surname: studentNameTokens(normalizedName.slice(0, commaIndex)),
      given: studentNameTokens(normalizedName.slice(commaIndex + 1))
    };
  };
  const left = getParts(leftName);
  const right = getParts(rightName);
  if (left.surname.length !== right.surname.length || left.given.length !== right.given.length) return false;

  const surnameExact = left.surname.every((token, index) => token === right.surname[index]);
  const surnameTypo = allowTypo
    && left.surname.length === 1
    && right.surname.length === 1
    && hasOneCharacterDifference(left.surname[0], right.surname[0]);
  if (!surnameExact && !surnameTypo) return false;

  const findGivenMatch = (leftIndex: number, usedRightTokens: Set<number>, usedTypo: boolean): boolean => {
    if (leftIndex === left.given.length) return true;

    const leftToken = left.given[leftIndex];
    for (let rightIndex = 0; rightIndex < right.given.length; rightIndex++) {
      if (usedRightTokens.has(rightIndex)) continue;
      const rightToken = right.given[rightIndex];
      const isExact = leftToken === rightToken;
      const isInitial = Math.min(leftToken.length, rightToken.length) === 1
        && (leftToken.startsWith(rightToken) || rightToken.startsWith(leftToken));
      const isSingleTypo = allowTypo && !surnameTypo && !usedTypo
        && hasOneCharacterDifference(leftToken, rightToken);
      if (!isExact && !isInitial && !isSingleTypo) continue;

      usedRightTokens.add(rightIndex);
      if (findGivenMatch(leftIndex + 1, usedRightTokens, usedTypo || (!isExact && !isInitial))) return true;
      usedRightTokens.delete(rightIndex);
    }

    return false;
  };

  return left.surname.length > 0
    && left.given.length > 0
    && findGivenMatch(0, new Set<number>(), false);
};
