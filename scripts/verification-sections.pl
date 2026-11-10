#!/usr/bin/env perl
# Splits a verification file into its "## " sections, for check-verification.sh
# and verification-gaps.sh. Follows GitHub's markdown closely enough that what
# counts as content here is what a reviewer sees rendered:
#   - HTML comments (the template's guidance) are dropped, across lines too.
#   - Inside fenced code and inline code, "<!--" and "#" are literal text.
#
# Prints tab-separated records:
#   H <tab> <section name, lowercased>     at each "## " heading
#   C <tab> <section name> <tab> <line>    each content line in a section
# Outside code, a content line has a letter, digit, or non-ASCII character and
# isn't a "###" heading.
# Exits 3 if a comment is never closed: GitHub would hide everything after it.
use strict;
use warnings;

my ($section, $fence, $in_comment) = ("", undef, 0);

sub content { print "C\t$section\t$_[0]\n" if $section ne "" }

# Drops comments from one line outside fenced code, keeping inline code
# (a run of N backticks up to the next run of exactly N) as is.
sub strip_comments {
  my ($line) = @_;
  my $out = "";
  while (length $line) {
    if ($in_comment) {
      if ($line =~ s/^.*?-->//s) { $in_comment = 0 } else { return $out }
    } elsif ($line =~ s/^(`+)//) {
      my $ticks = $1;
      if ($line =~ s/^(.*?(?<!`)\Q$ticks\E(?!`))//) { $out .= $ticks . $1 }
      else { $out .= $ticks }
    } elsif ($line =~ s/^<!--(?:-?>)?//) {
      # "<!-->" and "<!--->" are complete (empty) comments.
      next if $& =~ />$/;
      if ($line =~ /-->/) { $in_comment = 1 }
      # An unclosed comment only hides what follows when it starts a block
      # (the line, after any indent and list or quote markers); mid-line,
      # GitHub shows it as text.
      elsif ($out =~ /^ {0,3}(?:(?:[-*+]|\d+[.)]|>)[ \t]*)*$/) { $in_comment = 1 }
      else { $out .= "<!--" }
    } elsif ($line =~ s/^([^`<]+|<)//) {
      $out .= $1;
    }
  }
  return $out;
}

while (my $line = <>) {
  $line =~ s/\r?\n\z//;

  if (defined $fence) {
    content($line);
    $fence = undef if $line =~ /^ {0,3}(\Q$fence\E+)[ \t]*$/ && length($1) >= length($fence);
    next;
  }
  if (!$in_comment && $line =~ /^ {0,3}(`{3,}(?=[^`]*$)|~{3,})/) {
    $fence = $1;
    content($line);
    next;
  }

  $line = strip_comments($line);
  if ($line =~ /^ {0,3}##[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/ || $line =~ /^ {0,3}##[ \t]*$/) {
    $section = lc($1 // "");
    print "H\t$section\n";
  } elsif ($line =~ /^ {0,3}#(?:[ \t]|$)/) {
    $section = "";
  } elsif ($line !~ /^ {0,3}###/ && $line =~ /[[:alnum:]]|[^\x00-\x7F]/) {
    content($line);
  }
}

exit($in_comment ? 3 : 0);
