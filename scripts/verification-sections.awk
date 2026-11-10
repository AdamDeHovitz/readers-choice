# Splits a verification file into its "## " sections, for check-verification.sh
# and verification-gaps.sh. Input must already have HTML comments stripped.
#
# Prints one tab-separated record per line:
#   H <tab> <section name, lowercased>          at each "## " heading
#   C <tab> <section name> <tab> <line>        each content line in a section
# A content line has at least one letter or digit and isn't a "###" heading.
# Lines in fenced code blocks are content, never headings.

{ sub(/\r$/, "") }

/^[ \t]*(```|~~~)/ { fence = !fence; if (cur != "") print "C\t" cur "\t" $0; next }
fence { if (cur != "") print "C\t" cur "\t" $0; next }

/^##[ \t]/ {
  cur = tolower($0)
  sub(/^##[ \t]+/, "", cur)
  sub(/[ \t#]+$/, "", cur)
  print "H\t" cur
  next
}
/^#[ \t]/ { cur = ""; next }
/^###/ { next }
cur != "" && /[[:alnum:]]/ { print "C\t" cur "\t" $0 }
