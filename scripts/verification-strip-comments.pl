#!/usr/bin/env perl
# Prints a verification file with its HTML comments (the template's guidance)
# removed, for check-verification.sh and verification-gaps.sh. "<!--" inside
# inline code or a fenced code block is literal text, as on GitHub.
# Exits 3 if a comment is never closed: GitHub would hide everything after it.
use strict;
use warnings;

local $/;
my $text = <>;
$text =~ s/\r\n/\n/g;

my $code = qr/^[ \t]*(?<fence>```|~~~)[^\n]*\n.*?^[ \t]*\k<fence>[^\n]*$|`[^`\n]*`/sm;

# Keep code as is; drop closed comments.
$text =~ s/($code)|<!--.*?-->/defined $1 ? $1 : ""/ge;
print $text;

(my $outside_code = $text) =~ s/$code//g;
exit 3 if $outside_code =~ /<!--/;
