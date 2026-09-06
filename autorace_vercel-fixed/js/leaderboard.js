// leaderboard.js - AutoRace Career & Leaderboard System
(function() {
  'use strict';

  class LeaderboardManager {
    constructor() {
      this.container = null;
    }

    init(containerEl) {
      this.container = containerEl;
      this.render();
    }

    render() {
      if (!this.container) return;
      const storage = window.AutoRaceStorage;
      const entries = storage.getLeaderboard();
      const career = storage.data.career;

      // Find player rank
      const playerRank = entries.findIndex(e => e.isPlayer) + 1;

      let rowsHtml = '';
      entries.forEach((driver, idx) => {
        const rank = idx + 1;
        const isPlayer = !!driver.isPlayer;
        const winRate = driver.racesCompleted > 0 ? Math.round((driver.wins / driver.racesCompleted) * 100) : 0;

        let medal = '';
        if (rank === 1) medal = '🥇';
        else if (rank === 2) medal = '🥈';
        else if (rank === 3) medal = '🥉';
        else medal = `#${rank}`;

        rowsHtml += `
          <tr class="${isPlayer ? 'player-row' : ''}">
            <td class="col-rank">${medal}</td>
            <td class="col-name">
              <strong>${driver.name}</strong>
              ${isPlayer ? '<span class="you-badge">YOU</span>' : ''}
            </td>
            <td class="col-races"><strong>${driver.racesCompleted}</strong></td>
            <td class="col-wins">${driver.wins}</td>
            <td class="col-winrate">${winRate}%</td>
            <td class="col-bestlap">${driver.bestLap || '--:--.--'}</td>
          </tr>
        `;
      });

      this.container.innerHTML = `
        <div class="leaderboard-wrapper">
          <div class="leaderboard-header">
            <div>
              <h2 class="section-title">GLOBAL RACING LEADERBOARD</h2>
              <p class="section-subtitle">Ranked by <strong>Races Completed</strong> & Endurance Victories.</p>
            </div>
            <div class="wallet-badge">
              <span class="coin-icon">💰</span>
              <span class="wallet-val">$${storage.getCash()}</span>
            </div>
          </div>

          <!-- Player Career Summary Bar -->
          <div class="career-stats-banner">
            <div class="stat-pill">
              <span class="stat-label">Your Standing</span>
              <strong class="stat-num rank-highlight">#${playerRank}</strong>
            </div>
            <div class="stat-pill">
              <span class="stat-label">Races Finished</span>
              <strong class="stat-num">${career.racesCompleted || 0}</strong>
            </div>
            <div class="stat-pill">
              <span class="stat-label">Total 1st Places</span>
              <strong class="stat-num">${career.wins || 0}</strong>
            </div>
            <div class="stat-pill">
              <span class="stat-label">Total Drift Cash</span>
              <strong class="stat-num text-gold">+$${career.totalDriftCash || 0}</strong>
            </div>
          </div>

          <!-- Leaderboard Table -->
          <div class="table-container">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th class="col-rank">Rank</th>
                  <th class="col-name">Driver</th>
                  <th class="col-races">Races Completed</th>
                  <th class="col-wins">Wins</th>
                  <th class="col-winrate">Win Rate</th>
                  <th class="col-bestlap">Fastest Lap</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="leaderboard-footer">
            <small>Tip: Finish more races and drift aggressively around corners to climb to #1!</small>
          </div>
        </div>
      `;
    }
  }

  window.AutoRaceLeaderboard = new LeaderboardManager();
})();
