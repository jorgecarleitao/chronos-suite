#!/usr/bin/env node
import https from 'https';
import fs from 'fs';
import { randomUUID } from 'crypto';

const TOKEN = process.env.ACCESS_TOKEN;
const SESSION_URL = process.env.VITE_JMAP_SESSION_ENDPOINT;

if (!TOKEN || !SESSION_URL) {
    console.error('Set ACCESS_TOKEN and VITE_JMAP_SESSION_ENDPOINT');
    process.exit(1);
}

const req = (url: string, opts: https.RequestOptions, body?: any): Promise<any> => new Promise((ok, fail) => {
    const u = new URL(url);
    const r = https.request({ hostname: u.hostname, port: u.port, path: u.pathname, ...opts }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => ok(JSON.parse(d)));
    });
    r.on('error', fail);
    if (body) r.write(JSON.stringify(body));
    r.end();
});

const jmap = (url: string, calls: any[]) => req(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
}, {
    using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:calendars'],
    methodCalls: calls
});

(async () => {
    const session = await req(SESSION_URL, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    const accountId = session.primaryAccounts?.['urn:ietf:params:jmap:calendars'];
    
    if (!accountId) {
        console.error('No account found. Available accounts:', session);
        process.exit(1);
    }
    
    // Get user identity for organizer
    const identities = await jmap(session.apiUrl, [['Identity/get', { accountId }, 'i1']]);
    const userEmail = identities.methodResponses[0][1].list[0]?.email;
    const userName = identities.methodResponses[0][1].list[0]?.name;
    
    const cals = await jmap(session.apiUrl, [['Calendar/get', { accountId }, 'c1']]);
    console.log(JSON.stringify(cals, null, 2));
    const calId = (cals.methodResponses[0][1].list.find((c: any) => c.isDefault)).id;
    console.log(calId);
    
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(14, 0, 0, 0);
    
    const setPayload = {
        accountId,
        create: {
            'new-event': {
                uid: randomUUID(),
                title: 'Team Meeting - Script Generated',
                start: start.toISOString().split('.')[0],
                duration: 'PT1H',
                timeZone: 'Europe/London',
                calendarIds: { [calId]: true },
                showWithoutTime: false,
                participants: {
                    'p1': {
                        '@type': 'Participant',
                        name: userName,
                        scheduleId: `mailto:${userEmail}`,
                        sendTo: {
                            imip: `mailto:${userEmail}`
                        },
                        kind: 'individual',
                        roles: { owner: true, attendee: true },
                        participationStatus: 'accepted',
                        expectReply: false
                    },
                    'p2': {
                        '@type': 'Participant',
                        name: 'Jorge',
                        scheduleId: 'mailto:jorgecarleitao@gmail.com',
                        sendTo: { 
                            imip: 'mailto:jorgecarleitao@gmail.com'
                        },
                        kind: 'individual',
                        roles: { attendee: true },
                        participationStatus: 'needs-action',
                        expectReply: true
                    }
                },
                mayInviteSelf: false,
                mayInviteOthers: false,
                useDefaultAlerts: false,
                alerts: null
            }
        },
        sendSchedulingMessages: true
    };
    
    // Write full JMAP request body to file
    const methodCalls = [['CalendarEvent/set', setPayload, 'c1']];
    fs.writeFileSync('set.json', JSON.stringify(methodCalls, null, 2));
    console.log('✅ Payload written to set.json');
    
    const res = await jmap(session.apiUrl, methodCalls);

    console.log('\n=== Full Response ===');
    console.log(JSON.stringify(res, null, 2));

    const setResponse = res.methodResponses[0][1];
    const created = setResponse.created?.['new-event'];
    
    if (created) {
        console.log(`\n✅ Event ${created.id} created`);

        // Check if scheduling messages info is in response
        if (setResponse.updated || setResponse.notCreated || setResponse.notUpdated) {
            console.log('\n⚠️  Additional response info:', {
                updated: setResponse.updated,
                notCreated: setResponse.notCreated,
                notUpdated: setResponse.notUpdated
            });
        }
        
        console.log('\n📧 Scheduling messages status:');
        console.log('   sendSchedulingMessages: true (requested)');
        console.log('   Target: jorgecarleitao@gmail.com');
        console.log('\nNote: Check your Gmail spam folder. Server must be configured to send emails.');
        
        // Fetch the created event
        console.log('\n=== Fetching created event ===');
        const getRes = await jmap(session.apiUrl, [['CalendarEvent/get', {
            accountId,
            ids: [created.id],
            properties: ['id', 'title', 'start', 'duration', 'timeZone', 'participants', 'calendarIds', 'uid', 'showWithoutTime', 'mayInviteSelf', 'mayInviteOthers', 'useDefaultAlerts', 'alerts']
        }, 'g1']]);
        console.log(JSON.stringify(getRes, null, 2));
        const fetchedEvent = getRes.methodResponses[0][1].list[0];
        console.log('\n=== Participants Check ===');
        console.log('Has participants field?', fetchedEvent?.participants ? 'YES' : 'NO');
        if (fetchedEvent?.participants) {
            console.log('Participants:', JSON.stringify(fetchedEvent.participants, null, 2));
        }
    } else {
        console.error('❌ Event creation failed:', setResponse);
    }
    
    // Query all events
    console.log('\n=== Querying all events ===');
    
    const after = new Date(start);
    after.setDate(after.getDate() - 1);
    const before = new Date(start);
    before.setDate(before.getDate() + 1);
    
    const queryRes = await jmap(session.apiUrl, [['CalendarEvent/query', {
        accountId,
        timeZone: 'UTC',
        filter: {
            after: after.toISOString().replace(/\.\d{3}Z$/, ''),
            before: before.toISOString().replace(/\.\d{3}Z$/, ''),
            inCalendar: calId
        }
    }, 'q1']]);
    console.log('Query response:', JSON.stringify(queryRes, null, 2));
    const eventIds = queryRes.methodResponses[0][1].ids;
    console.log(`Found ${eventIds.length} events`);
    
    // Fetch all events
    const allEventsRes = await jmap(session.apiUrl, [['CalendarEvent/get', {
        accountId,
        ids: eventIds,
        properties: ['id', 'title', 'start', 'duration', 'timeZone', 'participants', 'calendarIds', 'uid', 'showWithoutTime', 'mayInviteSelf', 'mayInviteOthers', 'useDefaultAlerts', 'alerts']
    }, 'g2']]);
    console.log('\n=== Full Get Response ===');
    console.log(JSON.stringify(allEventsRes, null, 2));
    const allEvents = allEventsRes.methodResponses[0][1].list;
    
    // Write to file
    fs.writeFileSync('events.json', JSON.stringify(allEvents, null, 2));
    console.log(`\n✅ Saved ${allEvents.length} events to events.json`);
})().catch(e => { console.error(e.message); process.exit(1); });
