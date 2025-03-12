// Translation map for terms
const translationMap = {
    'Reason': 'Reden',
    'Next fixture': 'Volgende wedstrijd',
    'Muscle Injury': 'Spierblessure',
    'Ankle Injury': 'Enkelblessure',
    'Toe Injury': 'Teenblessure',
    'Knee Injury': 'Knieblessure',
    'Injury': 'Blessure',
    'Ribs Injury': 'Ribblessure',
    'Eye injury': 'Oogblessure',
    'Leg Injury': 'Beenblessure',
    'Broken ankle': 'Gebroken enkel',
    'Yellow Cards': 'Te veel gele kaarten',
    'Broken nose': 'Gebroken neus',
    'Foot Injury': 'Voetblessure',
    'Inactive': 'Inactief',
    'Lacking Match Fitness': 'Niet fit genoeg',
    'Groin Injury': 'Liesblessure',
    'Back Injury': 'Rugblessure',
    'Broken Leg': 'Gebroken been',
    'Achilles Tendon Injury': 'Achillespeesblessure',
    'Arm Injury': 'Armblessure',
    'Overload': 'Overbelasting',
    'Knock': 'Kneuzing'
};

// Function to translate reason to Dutch
function translateReason(reason) {
    return translationMap[reason] || reason;
}

// Function to format the date in Dutch format (e.g., 9 maart 2025 14:30)
function formatDateInDutch(date) {
    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    return new Intl.DateTimeFormat('nl-NL', options).format(date);
}

const backendUrl = "http://localhost:5000/injuries"; // ✅ Fetch from backend

async function fetchInjuries() {
    try {
        const response = await fetch(backendUrl);
        const data = await response.json();
        
        if (data && data.response) {
            processMissingPlayers(data.response); // ✅ Use the existing function to update the UI
        } else {
            console.error("❌ Error: No valid data returned from the backend");
        }
    } catch (error) {
        console.error("❌ Error fetching injuries from backend:", error);
    }
}

// ✅ Fetch injuries when the page loads
fetchInjuries();

// ⏳ Refresh every 12 hours (to get new data from Redis)
setInterval(fetchInjuries, 43200000);

// Function to get the next fixture for a team
async function getNextFixtureForTeam(teamId) {
    const urlWithParams = `${nextFixtureUrl}?team=${teamId}&next=1`; // Get the next fixture
    const response = await fetch(urlWithParams, optionsNextFixture);
    const data = await response.json();

    if (data.response && data.response.length > 0) {
        return data.response[0]; // Return the next fixture
    } else {
        return null; // No next fixture
    }
}

function getRelevantFixture(entries) {
    const futureFixtures = entries.filter(entry => new Date(entry.fixture.date) > new Date());
    const pastFixtures = entries.filter(entry => new Date(entry.fixture.date) <= new Date());

    // If future fixtures are available, use the first one (next fixture)
    if (futureFixtures.length > 0) {
        return futureFixtures[0]; // The next fixture
    }

    // Otherwise, fallback to the last fixture (most recent past fixture)
    const mostRecentPastFixture = pastFixtures.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))[0];
    return mostRecentPastFixture; // Most recent fixture
}

// Function to generate the navigation menu dynamically
function generateNavMenu(teams) {
    const navList = document.querySelector("nav ul");
    navList.innerHTML = ""; // Clear existing placeholders

    Object.keys(teams).sort((a, b) => a.localeCompare(b)).forEach(teamName => {
        const team = teams[teamName][0].team; // Get the team object

        // Create a list item
        const navItem = document.createElement("li");

        // Create a clickable link
        const navLink = document.createElement("a");
        navLink.href = `#team-${teamName.replace(/\s+/g, "-")}`; // Convert team name to a valid ID format
        navLink.title = teamName;

        // Create the team logo image
        const teamLogo = document.createElement("img");
        teamLogo.src = team.logo;
        teamLogo.alt = teamName;
        teamLogo.classList.add("header-logo");

        // Append the image to the link, and the link to the nav item
        navLink.appendChild(teamLogo);
        navItem.appendChild(navLink);
        navList.appendChild(navItem);
    });
}

// Modified function to fetch injuries based on the team and next fixture
async function fetchInjuriesForFixture() {
    const cacheKey = 'missingPlayersData';
    const cacheExpirationKey = 'missingPlayersDataExpiration';
    const cacheTTL = 12 * 60 * 60 * 1000; // 12 hours

    try {
        const cachedData = localStorage.getItem(cacheKey);
        const cacheExpiration = localStorage.getItem(cacheExpirationKey);
        const currentTime = Date.now();

        if (cachedData && cacheExpiration && (currentTime - cacheExpiration < cacheTTL)) {
            console.log("Using cached data");
            processMissingPlayers(JSON.parse(cachedData).response);
            return;
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!result.response) throw new Error("Unexpected API response");

        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheExpirationKey, currentTime.toString());

        processMissingPlayers(result.response);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function processMissingPlayers(players) {
    // Add a check to make sure players is an array
    if (!Array.isArray(players) || players.length === 0) {
        console.log("No missing players found or invalid data structure.");
        const playerList = document.getElementById("injury-list");
        playerList.innerHTML = '<li>No missing or questionable players available.</li>';
        return;
    }

    const playerList = document.getElementById("injury-list");
    playerList.innerHTML = "";

    // Group players by team
    const teams = {};
    players.forEach(entry => {
        const teamName = entry.team.name;
        if (!teams[teamName]) teams[teamName] = [];
        teams[teamName].push(entry);
    });

    // Generate the nav menu
    generateNavMenu(teams);

    // Sort and display teams
    Object.keys(teams).sort((a, b) => a.localeCompare(b)).forEach(teamName => {
        const teamDataDiv = document.createElement("div");
        teamDataDiv.classList.add("team-data");
        teamDataDiv.id = `team-${teamName.replace(/\s+/g, "-")}`; // Unique ID for navigation

        const teamHeaderDiv = document.createElement("div");
        teamHeaderDiv.classList.add("team-header");

        // Team Logo
        const teamLogo = document.createElement("img");
        teamLogo.src = teams[teamName][0].team.logo;
        teamLogo.alt = teamName;
        teamLogo.classList.add("team-logo");

        // Wrapper div for team info
        const teamInfoDiv = document.createElement("div");
        teamInfoDiv.classList.add("team-info");

        // H2: "<Teamname> - Blessures en schorsingen"
        const teamTitle = document.createElement("h3");
        teamTitle.textContent = `${teamName} - Blessures en schorsingen`;

        // Get the relevant fixture (next or most recent)
        const relevantFixture = getRelevantFixture(teams[teamName]);
        const fixtureDate = new Date(relevantFixture.fixture.date);
        const formattedDate = formatDateInDutch(fixtureDate);

        // P: "Volgende wedstrijd: <date>"
        const nextFixtureText = document.createElement("p");

        // Only use the next fixture info if it is a future fixture
        if (fixtureDate > new Date()) {
            nextFixtureText.textContent = `${translationMap['Next fixture']}: ${formattedDate}`;
        } else {
            nextFixtureText.textContent = `${translationMap['Next fixture']}: Nog niet beschikbaar (lijst is van afgelopen speelronde)`;
        }

        // Append elements
        teamInfoDiv.append(teamTitle, nextFixtureText);
        teamHeaderDiv.append(teamLogo, teamInfoDiv);
        teamDataDiv.appendChild(teamHeaderDiv);

        // Add the "Afwezigen" heading between the team header and player list
        const absentTitle = document.createElement("p");
        absentTitle.textContent = "Afwezigen";  // This is the new element
        teamDataDiv.appendChild(absentTitle);

        // Players List
        const teamList = document.createElement("ul");
        teamList.classList.add("player-list");

        // Filter out injuries based on the relevant fixture
        teams[teamName].forEach(entry => {
            const fixtureDate = new Date(entry.fixture.date);
            const relevantFixtureDate = new Date(relevantFixture.fixture.date);
            if (fixtureDate.getTime() === relevantFixtureDate.getTime()) { // Compare fixture dates
                if (entry.player.type === 'Missing Fixture' || entry.player.type === 'Questionable') {
                    const playerItem = document.createElement("li");
                    playerItem.classList.add("player-item");

                    let playerText = ` 
                        <img src="${entry.player.photo}" alt="${entry.player.name}" width="40" height="40">
                        <strong>${entry.player.name}</strong>&nbsp;-&nbsp;
                        <span class="reason-text">${translateReason(entry.player.reason || "Onbekend")}</span>
                    `;

                    if (entry.player.type === 'Questionable') {
                        playerText = playerText.replace(
                            `<strong>${entry.player.name}</strong>`,
                            `<strong>${entry.player.name} (Twijfelachtig)</strong>`
                        );
                    }

                    playerItem.innerHTML = playerText;
                    const reasonText = playerItem.querySelector('.reason-text');
                    reasonText.classList.add('player-reason');

                    if (entry.player.type === 'Questionable') {
                        playerItem.classList.add('questionable');
                    }

                    teamList.appendChild(playerItem);
                }
            }
        });

        // If no players, add message
        if (teamList.children.length === 0) {
            const noFixturesItem = document.createElement('li');
            noFixturesItem.textContent = 'Ontbrekende spelers nog niet bekend';
            teamList.appendChild(noFixturesItem);
        }

        teamDataDiv.appendChild(teamList);
        playerList.appendChild(teamDataDiv);
    });
}

// Initial fetch
fetchInjuriesForFixture();
setInterval(fetchInjuriesForFixture, 43200000); // 12 hours interval for fresh data