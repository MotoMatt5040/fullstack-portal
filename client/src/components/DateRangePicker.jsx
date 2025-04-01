import {
	Button,
	CalendarCell,
	CalendarGrid,
	DateInput,
	DateRangePicker,
	DateSegment,
	Dialog,
	Group,
	Heading,
	Label,
	Popover,
	RangeCalendar,
} from 'react-aria-components';
import React from 'react';
import './css/DateRangePicker.css';

const MyDateRangePicker = ({ value, onChange, label }) => {
	return (
		<DateRangePicker value={value} onChange={onChange}>
			<Label>{label}</Label>
			<Group>
				<DateInput slot="start">
					{(segment) => <DateSegment segment={segment} />}
				</DateInput>
				<span aria-hidden="true">–</span>
				<DateInput slot="end">
					{(segment) => <DateSegment segment={segment} />}
				</DateInput>
				<Button>▼</Button>
			</Group>
			<Popover>
				<Dialog>
					<RangeCalendar>
						<header>
							<Button slot="previous">◀</Button>
							<Heading />
							<Button slot="next">▶</Button>
						</header>
						<CalendarGrid>
							{(date) => <CalendarCell date={date} />}
						</CalendarGrid>
					</RangeCalendar>
				</Dialog>
			</Popover>
		</DateRangePicker>
	);
};

export default MyDateRangePicker;
