var VIZ = VIZ || {};

/**
 *
 * @param candidates A d3 map from candidate keys to candidate info
 * @param votes A list of vote record, each record is an object with keys
 * first, second, third, and votes. The first, second, and third params
 * are keys for candidates. Votes is the number of votes that entry received.
 *
 * @constructor
 */
VIZ.Model = function(candidates, votes) {
    this.currentRound = 0;
    this.roundCandidates = candidates;

    this.candidates = candidates;
    this.votes = votes;
    this.rounds = [];   // list of information about rounds. See simulateRound.
    this.simulateElection();
    this.jumpToRound(0);
};

/**
 * @returns {Number} Total number of rounds
 */
VIZ.Model.prototype.getNumRounds = function() {
    return this.rounds.length;
};

/**
 * @returns {number} Current round
 */
VIZ.Model.prototype.getCurrentRound = function() {
    return this.currentRound;
};

/**
 * Returns the vote counts for alternate candidates in the current round.
 * @param c Candidate key
 */
VIZ.Model.prototype.getAlternates = function(c) {
    return this.roundCandidates.get(c).alternates;
};

/**
 * Returns information about the candidate in the current round.
 * @param c
 * @returns {*}
 */
VIZ.Model.prototype.getCandidate = function(c) {
    return this.roundCandidates.get(c);
};

/**
 * Returns a map from candidate keys to candidate info in the current round.
 * @param c
 */
VIZ.Model.prototype.getCandidates = function() {
    return this.roundCandidates;
};

/**
 * Returns the candidate names who are popular alternates
 * for the candidate in the current round
 * @param c
 */
VIZ.Model.prototype.getPopularAlternates = function(c) {
    var candidates = [];
    var n = this.getCandidate(c).votes;
    var alts = this.getAlternates(c);
    var altCounts = alts.values().sort(d3.descending);
    var threshold = Math.min(altCounts[2],n/10);
    this.getAlternates(c).forEach(function (c2, n2) {
        if (n2 >= threshold) {
            candidates.push(c2);
        }
    });
    return candidates;
};

/**
 * @param i Jump to a particular round, and update current
 * candidates with notable information.
 */
VIZ.Model.prototype.jumpToRound = function(i) {
    var self = this;
    this.currentRound = i;
    this.roundCandidates = d3.map();
    var r = this.rounds[i];
    r.remaining.forEach(function (c) {
        var cinfo = self.candidates.get(c);
        self.roundCandidates.set(c, cinfo);
        cinfo.votes = r.tally.get(c);
        cinfo.alternates = r.alternates.get(c);
    });
};

/**
 * Simulate entire election.
 */
VIZ.Model.prototype.simulateElection = function() {
    var remaining = d3.set(this.candidates.keys());
    while (true) {
        var round = this.simulateRound(remaining);
        this.rounds.push(round);
        if (round.finished) {
            break;
        }
        VIZ.log("removing " + round.minCand + " with " + round.tally.get(round.minCand));
        remaining.remove(round.minCand);
    }
};


/**
 * Given a list of
 * @param remaining
 * @returns {{
 *      minCand: string key for remaining candidate with min votes,
 *      maxCand: string key for remaining candidate with max votes,
 *      tally: d3.map from candidate keys to num votes,
 *      finished: boolean true iff the election is finished,
 *      alternates: two-level map of alternates for each candidate and count of votes,
 *      remaining: d3.set of remaining candidate keys
 *   }}
 */
VIZ.Model.prototype.simulateRound = function(remaining) {
    var tally = d3.map();

    remaining.forEach(function (c) {
        tally.set(c, 0);
    });

    var alternates = d3.map();  // counts for delegates for each candidate
    remaining.forEach(function (c) {
        alternates.set(c, d3.map(tally));
    });

    this.votes.forEach(function (v) {
        // create list of remaining candidates
        var l = [v.first, v.second, v.third];
        l = l.filter(function (c) { return tally.has(c); });

        // update votes for candidate
        if (l.length >= 1) {
            tally.set(l[0], tally.get(l[0]) + v.votes);
        }

        // update remaining votes for candidate
        if (l.length >= 2) {
            var dc =  alternates.get(l[0]);
            dc.set(l[1], dc.get(l[1]) + v.votes);
        }
    });
    var valid = d3.sum(tally.values());
    var minCand = null;
    var maxCand = null;
    tally.forEach(function (c, n) {
        if (minCand == null) {
            minCand = maxCand = c;
        }
        if (n < tally.get(minCand)) {
            minCand = c;
        } else if (n > tally.get(maxCand)) {
            maxCand = c;
        }
    });

    return {
        minCand : minCand,
        maxCand : maxCand,
        tally : tally,
        valid : valid,
        alternates : alternates,
        finished : (tally.get(maxCand) > valid / 2 + 1),
        remaining : d3.set(remaining.values())   // copy
    };
};