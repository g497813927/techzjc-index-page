type Author = {
    firstName: string;
    lastName: string;
    suffix?: string;
    highlight: boolean;
    orcid?: string;
}

type PublicationProps = {
  title: string;
  authors: Author[];
  publication_year: number;

  venue_full: string;
  venue_short?: string;
  publisher?: string;
  location?: string;
  pages?: string;

  doi?: string;
  url?: string;
  abstract?: string;
};
