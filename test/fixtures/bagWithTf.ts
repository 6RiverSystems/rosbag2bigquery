import { ReadResult } from "../../lib/interface/readResult";

export const messages: ReadResult[] = [
	{
		topic: '/test',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			header: {
				seq: 0,
				stamp: { secs: 0, nsecs: 0 },
				frame_id: null,
			},
			entity: "ENTITY",
			attribute: "ATTRIBUTE",
			value: 1.0,
		},
	},
	{
		topic: '/tf',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			transforms: [
				{
					header: {
						frame_id: "odom",
						seq: 0,
						stamp: { secs: 0, nsecs: 0 },
					},
					child_frame_id: "base_footprint",
					transform: {
						translation: {
							x: 10,
							y: 0,
							z: 0,
						},
						rotation: {
							x: 0,
							y: 0,
							z: 0,
							w: 1.0,
						},
					},
				},
				{
					header: {
						frame_id: "map",
						seq: 0,
						stamp: { secs: 0, nsecs: 0 },
					},
					child_frame_id: "odom",
					transform: {
						translation: {
							x: 10,
							y: 0,
							z: 0,
						},
						rotation: {
							x: 0,
							y: 0,
							z: 0,
							w: 1.0,
						},
					},
				},
			],
		},
	},
	{
		topic: '/test',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			header: {
				seq: 1,
				stamp: { secs: 1.0, nsecs: 0 },
				frame_id: "",
			},
			attribute: "ATTRIBUTE",
			entity: "ENTITY",
			value: 0.0,
		},
    },
    {
		topic: '/test',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			header: {
				seq: 1,
				stamp: { secs: 1.0, nsecs: 0 },
				frame_id: "",
			},
			attribute: "ATTRIBUTE",
			entity: "ENTITY",
			value: 0.0,
		},
    },
    {
		topic: '/tf',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			transforms: [
				{
					header: {
						frame_id: "odom",
						seq: 0,
						stamp: { secs: 0, nsecs: 0 },
					},
					child_frame_id: "base_footprint",
					transform: {
						translation: {
							x: 20,
							y: 0,
							z: 0,
						},
						rotation: {
							x: 0,
							y: 0,
							z: 0,
							w: 1.0,
						},
					},
				},
				{
					header: {
						frame_id: "map",
						seq: 0,
						stamp: { secs: 0, nsecs: 0 },
					},
					child_frame_id: "odom",
					transform: {
						translation: {
							x: 10,
							y: 0,
							z: 0,
						},
						rotation: {
							x: 0,
							y: 0,
							z: 0,
							w: 1.0,
						},
					},
				},
			],
		},
    },
    {
		topic: '/test',
		timestamp: {
			sec: 0,
			nsec: 0,
		},
		message: {
			header: {
				seq: 0,
				stamp: { secs: 0, nsecs: 0 },
				frame_id: null,
			},
			entity: "ENTITY",
			attribute: "ATTRIBUTE",
			value: 1.0,
		},
	},
];
